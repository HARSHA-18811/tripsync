import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Fuel,
  Hotel,
  Layers,
  MapPin,
  Navigation,
  Plus,
  Share2,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react';
import { useStore } from '../store';
import { useTrip } from '../hooks';
import { fmt, toMajor, toMinor, uid } from '../lib/money';
import { copyToClipboard, downloadCsv, downloadJson } from '../lib/util';
import { Alert, Avatar, Empty, Field, PageHeader, Stat } from '../components/ui';
import { RoadMap3D } from '../components/RoadMap3D';
import {
  generateRoadTripRoutes,
  type RoadStop,
  type RouteOption,
} from '../lib/routeGenerator';
import type { Category, ItineraryItem, Member, Trip } from '../types';

export function RoadTripPlanner() {
  const { tripId } = useParams();
  const { state, addTrip, updateTrip } = useStore();
  const nav = useNavigate();

  // Find trip if accessed from within a trip workspace
  const currentTrip = tripId ? state.trips.find((t) => t.id === tripId) : state.trips[0];
  const members = currentTrip?.members?.filter((m) => m.status === 'joined') ?? [
    { id: 'u1', name: 'Harsha', email: 'harsha@example.com' },
    { id: 'u2', name: 'Ananya', email: 'ananya@example.com' },
    { id: 'u3', name: 'Rohan', email: 'rohan@example.com' },
    { id: 'u4', name: 'Meera', email: 'meera@example.com' },
  ];

  // Generator form states
  const [origin, setOrigin] = useState<string>(currentTrip?.startCity || 'Nellore');
  const [destination, setDestination] = useState<string>(
    currentTrip?.destination?.includes('Coorg') ? 'Munnar, Kerala' : currentTrip?.destination || 'Munnar, Kerala'
  );
  const [budgetMajor, setBudgetMajor] = useState<string>('35000');
  const [days, setDays] = useState<number>(3);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);
  const [savedSuccessNote, setSavedSuccessNote] = useState<string | null>(null);

  // Generate routes on state change or submission
  const routes = useMemo(() => {
    return generateRoadTripRoutes({
      origin,
      destination,
      totalBudget: toMinor(budgetMajor || 0),
      days,
      members: members.map((m) => ({ id: m.id, name: m.name })),
      isRoundTrip,
    });
  }, [origin, destination, budgetMajor, days, members, isRoundTrip]);

  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const selectedRoute: RouteOption = routes[selectedRouteIdx] || routes[0];

  // Calculate cumulative expense paid by each member
  const memberPaidTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    members.forEach((m) => (totals[m.name] = 0));
    selectedRoute.stops.forEach((s) => {
      if (s.estimatedCost > 0) {
        totals[s.suggestedPayerName] = (totals[s.suggestedPayerName] || 0) + s.estimatedCost;
      }
    });
    return totals;
  }, [selectedRoute, members]);

  // Apply route to the current trip
  const handleApplyToTrip = () => {
    if (!currentTrip) return;

    updateTrip(
      currentTrip.id,
      (t) => {
        t.startCity = origin;
        t.destination = selectedRoute.destination;
        t.totalBudget = selectedRoute.budgetBreakdown.total;

        // Convert road stops into Itinerary items
        const newItineraryItems: ItineraryItem[] = selectedRoute.stops.map((stop, idx) => {
          const categoryToCost = stop.estimatedCost;
          return {
            id: uid(),
            day: stop.day,
            title: stop.title,
            time: stop.time,
            duration: stop.category === 'stay' ? 120 : stop.category === 'food' ? 60 : 30,
            location: stop.locationName,
            description: stop.description + (stop.recommendedMenu ? ` | Recommended: ${stop.recommendedMenu}` : ''),
            cost: categoryToCost,
            url: '',
            notes: `Assigned payer: ${stop.suggestedPayerName}`,
            owner: stop.suggestedPayerId,
            status: 'planned',
            votes: [],
            comments: [],
            sortOrder: idx,
          };
        });

        t.itinerary = newItineraryItems;

        // Add pre-scheduled expenses into the expenses tab
        selectedRoute.stops
          .filter((s) => s.estimatedCost > 0)
          .forEach((s) => {
            const catMap: Record<string, Category> = {
              food: 'Food',
              fuel: 'Fuel',
              toll: 'Transportation',
              stay: 'Accommodation',
              activity: 'Activities',
              viewpoint: 'Activities',
            };
            const cat = catMap[s.category] || 'Other';
            const allJoined = t.members.filter((m) => m.status === 'joined').map((m) => m.id);
            const perShare = Math.round(s.estimatedCost / Math.max(1, allJoined.length));
            const shares: Record<string, number> = {};
            allJoined.forEach((id) => (shares[id] = perShare));

            t.expenses.push({
              id: uid(),
              title: s.title,
              amount: s.estimatedCost,
              category: cat,
              date: new Date().toISOString().slice(0, 10),
              paidBy: s.suggestedPayerId,
              method: 'equal',
              splitValues: {},
              shares,
              notes: `Stop at KM ${s.distanceFromStartKm} (${s.locationName})`,
              createdBy: s.suggestedPayerId,
              createdAt: new Date().toISOString(),
              history: [],
            });
          });
      },
      `applied 3D road trip plan "${selectedRoute.title}" with ${selectedRoute.stops.length} stops`
    );

    setSavedSuccessNote(`Plan successfully applied to ${currentTrip.name}!`);
    setTimeout(() => nav(`/trips/${currentTrip.id}/itinerary`), 1200);
  };

  // Create brand new trip from this road route
  const handleSaveAsNewTrip = () => {
    const newTripId = uid();
    const newTrip: Trip = {
      id: newTripId,
      name: `${origin} to ${destination} Road Trip`,
      description: `${selectedRoute.title} — ${selectedRoute.tagline}. Total ${selectedRoute.totalDistanceKm} km.`,
      startCity: origin,
      destination: selectedRoute.destination,
      start: new Date().toISOString().slice(0, 10),
      end: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
      currency: currentTrip?.currency || 'INR',
      totalBudget: selectedRoute.budgetBreakdown.total,
      perPersonBudget: Math.round(selectedRoute.budgetBreakdown.total / Math.max(1, members.length)),
      flexibility: 'Somewhat flexible (±10%)',
      status: 'Planning',
      inviteCode: `ROAD-${uid().slice(0, 4).toUpperCase()}`,
      pace: 'balanced',
      votingClosed: false,
      votingDeadline: '',
      categoryBudgets: {
        Transportation: selectedRoute.budgetBreakdown.tolls,
        Fuel: selectedRoute.budgetBreakdown.fuel,
        Food: selectedRoute.budgetBreakdown.food,
        Accommodation: selectedRoute.budgetBreakdown.stay,
        Activities: selectedRoute.budgetBreakdown.activities,
      },
      demo: true,
      members: members.map((m, idx) => ({
        id: m.id,
        name: m.name,
        email: (m as any).email || `${m.name.toLowerCase()}@example.com`,
        role: idx === 0 ? 'organizer' : 'member',
        status: 'joined',
        budget: Math.round(selectedRoute.budgetBreakdown.total / members.length),
        styles: ['nature', 'food'],
        pace: 'balanced',
        accommodation: 'homestay',
        transport: 'car',
      })),
      destinations: [
        {
          id: uid(),
          name: selectedRoute.destination,
          description: selectedRoute.tagline,
          cost: selectedRoute.budgetBreakdown.total,
          days,
          distanceKm: selectedRoute.totalDistanceKm,
          attractions: selectedRoute.days.flatMap((d) => d.highlights),
          imageUrl: '',
          by: members[0].id,
          votes: members.map((m) => m.id),
          comments: [],
        },
      ],
      itinerary: selectedRoute.stops.map((stop, idx) => ({
        id: uid(),
        day: stop.day,
        title: stop.title,
        time: stop.time,
        duration: stop.category === 'stay' ? 120 : stop.category === 'food' ? 60 : 30,
        location: stop.locationName,
        description: stop.description + (stop.recommendedMenu ? ` (Menu: ${stop.recommendedMenu})` : ''),
        cost: stop.estimatedCost,
        url: '',
        notes: `Assigned payer: ${stop.suggestedPayerName}`,
        owner: stop.suggestedPayerId,
        status: 'planned',
        votes: [],
        comments: [],
        sortOrder: idx,
      })),
      transport: [
        {
          id: uid(),
          mode: 'car',
          from: origin,
          to: selectedRoute.destination,
          depart: `${new Date().toISOString().slice(0, 10)}T05:30`,
          arrive: `${new Date().toISOString().slice(0, 10)}T19:30`,
          fare: selectedRoute.budgetBreakdown.fuel + selectedRoute.budgetBreakdown.tolls,
          url: '',
          passengers: `All ${members.length}`,
          notes: `${selectedRoute.roadCondition}. Fuel split evenly.`,
          status: 'selected',
          votes: members.map((m) => m.id),
        },
      ],
      accommodation: [
        {
          id: uid(),
          name: `${destination} Resort & Homestay`,
          location: destination,
          checkIn: new Date().toISOString().slice(0, 10),
          checkOut: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
          cost: selectedRoute.budgetBreakdown.stay,
          rooms: 2,
          roomAlloc: 'All members',
          url: '',
          cancellation: 'Free cancellation until 48 hours prior',
          status: 'selected',
          votes: members.map((m) => m.id),
        },
      ],
      expenses: selectedRoute.stops
        .filter((s) => s.estimatedCost > 0)
        .map((s) => {
          const perShare = Math.round(s.estimatedCost / Math.max(1, members.length));
          const shares: Record<string, number> = {};
          members.forEach((m) => (shares[m.id] = perShare));
          return {
            id: uid(),
            title: s.title,
            amount: s.estimatedCost,
            category: s.category === 'food' ? 'Food' : s.category === 'fuel' ? 'Fuel' : s.category === 'stay' ? 'Accommodation' : 'Transportation',
            date: new Date().toISOString().slice(0, 10),
            paidBy: s.suggestedPayerId,
            method: 'equal',
            splitValues: {},
            shares,
            notes: `Road stop at KM ${s.distanceFromStartKm}`,
            createdBy: s.suggestedPayerId,
            createdAt: new Date().toISOString(),
            history: [],
          };
        }),
      settlements: [],
      messages: [
        {
          id: uid(),
          by: members[0].id,
          text: `Welcome to the ${origin} → ${destination} road trip! Route selected: ${selectedRoute.title}.`,
          at: new Date().toISOString(),
          pinned: true,
        },
      ],
      decisions: [],
      checklist: ['Car PUC & Insurance', 'FASTag balance min ₹1,500', 'Emergency tire inflator', 'Sunscreen & raincoats'].map((t) => ({ id: uid(), text: t, done: false })),
      activity: [{ id: uid(), text: `${members[0].name} generated the 3D road trip plan`, at: new Date().toISOString(), by: members[0].id }],
    };

    addTrip(newTrip);
    setSavedSuccessNote(`Created new trip "${newTrip.name}"!`);
    setTimeout(() => nav(`/trips/${newTripId}/overview`), 1200);
  };

  // 1-Click WhatsApp plan copy
  const handleCopyWhatsApp = async () => {
    let text = `🚗 *${selectedRoute.title}*\n`;
    text += `📍 *Route:* ${selectedRoute.viaSummary}\n`;
    text += `🛣️ *Total Distance:* ${selectedRoute.totalDistanceKm} km (~${selectedRoute.totalDriveHours}h drive)\n`;
    text += `💰 *Est. Total Budget:* ${fmt(selectedRoute.budgetBreakdown.total, 'INR')}\n\n`;

    selectedRoute.days.forEach((d) => {
      text += `📅 *Day ${d.day}: ${d.title}*\n`;
      text += `• Drive: ${d.startPoint} ➔ ${d.endPoint} (${d.distanceKm} km)\n`;
      text += `• Highlights: ${d.highlights.join(' · ')}\n\n`;
      text += `🛑 *SCHEDULED STOPS & FOOD:*\n`;
      d.stops.forEach((s) => {
        text += `  • ${s.time} [KM ${s.distanceFromStartKm}] ${s.title}\n`;
        if (s.recommendedMenu) text += `    🍽️ Menu: ${s.recommendedMenu}\n`;
        if (s.estimatedCost > 0) text += `    💵 ${fmt(s.estimatedCost, 'INR')} ➔ Paid by ${s.suggestedPayerName}\n`;
      });
      text += `\n`;
    });

    text += `🤝 *PAYMENT ASSIGNMENTS:*\n`;
    Object.entries(memberPaidTotals).forEach(([name, amt]) => {
      text += `• ${name}: ${fmt(amt, 'INR')}\n`;
    });

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Road Trip & Route Planner"
        sub="Plan complete road journeys with food stops, fuel points, 3D interactive terrain, and balanced payment schedules."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="btn-ghost text-xs"
              title="Copy complete road plan formatted for WhatsApp"
            >
              {copiedPlan ? <Check className="h-4 w-4 text-teal" /> : <Share2 className="h-4 w-4" />}
              {copiedPlan ? 'Copied to WhatsApp!' : 'Share road plan'}
            </button>
            {currentTrip && (
              <button
                type="button"
                onClick={handleApplyToTrip}
                className="btn-brand text-xs font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" /> Apply to {currentTrip.name}
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAsNewTrip}
              className="btn-primary text-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Create as new trip
            </button>
          </div>
        }
      />

      {savedSuccessNote && (
        <Alert tone="good">
          <b>Success!</b> {savedSuccessNote} Redirecting...
        </Alert>
      )}

      {/* Input Route Generator Form */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-navy uppercase tracking-wide">Route Parameters</span>
            <div className="flex rounded-lg bg-sand/60 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsRoundTrip(true)}
                className={`rounded-md px-2.5 py-1 transition ${isRoundTrip ? 'bg-navy text-white shadow-sm' : 'text-navy/70 hover:text-navy'
                  }`}
              >
                🔄 Round Trip ({origin} ⇄ {destination.split(',')[0]} ⇄ {origin})
              </button>
              <button
                type="button"
                onClick={() => setIsRoundTrip(false)}
                className={`rounded-md px-2.5 py-1 transition ${!isRoundTrip ? 'bg-navy text-white shadow-sm' : 'text-navy/70 hover:text-navy'
                  }`}
              >
                ➔ One-Way
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOrigin('Nellore');
              setDestination('Munnar, Kerala');
              setBudgetMajor('35000');
              setDays(3);
              setIsRoundTrip(true);
            }}
            className="text-xs font-semibold text-brand hover:underline"
          >
            ⚡ Reset to Nellore ➔ Kerala ➔ Nellore
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Starting City">
            <input
              className="input font-medium"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Nellore"
            />
          </Field>
          <Field label="Destination">
            <input
              className="input font-medium"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Munnar, Kerala"
            />
          </Field>
          <Field label="Total Group Budget (₹)">
            <input
              type="number"
              min={1000}
              className="input font-medium"
              value={budgetMajor}
              onChange={(e) => setBudgetMajor(e.target.value)}
            />
          </Field>
          <Field label="Trip Duration">
            <select
              className="input"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={2}>2 Days (Weekend Express)</option>
              <option value={3}>3 Days (Standard Circuit)</option>
              <option value={4}>4 Days (Relaxed Explorer)</option>
              <option value={5}>5 Days (Complete Tour)</option>
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setSelectedRouteIdx(0)}
              className="btn-brand w-full font-semibold shadow-md flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> Generate Plans
            </button>
          </div>
        </div>
      </div>

      {/* Route Comparison Selector Cards */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy flex items-center gap-2">
            <span>Suggested Route Options ({routes.length})</span>
            <span className="badge !bg-teal/15 !text-teal text-xs">Compare & Select</span>
          </h2>
          <span className="text-xs text-navy/50">Pick a route to view its 3D road map and stops</span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {routes.map((r, idx) => {
            const isSelected = selectedRouteIdx === idx;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRouteIdx(idx)}
                className={`card cursor-pointer !p-4 transition border-2 ${isSelected
                    ? 'border-brand bg-brand/5 shadow-md ring-2 ring-brand/20'
                    : 'border-black/5 hover:border-black/20 hover:shadow'
                  }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`badge ${isSelected ? '!bg-brand !text-white' : ''}`}>
                    Option {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-amber-600">
                    {'★'.repeat(Math.round(r.scenicRating))} {r.scenicRating}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-navy">{r.title}</h3>
                <p className="mt-1 text-xs text-navy/60 line-clamp-2">{r.tagline}</p>

                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2 text-xs font-semibold">
                  <span className="text-navy">{r.totalDistanceKm} km · {r.totalDriveHours}h</span>
                  <span className="text-teal">{fmt(r.budgetBreakdown.total, 'INR')}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-navy/50">
                  <span>🍽️ {r.stops.filter((s) => s.category === 'food').length} Food Stops</span>
                  <span>·</span>
                  <span>⛽ {r.stops.filter((s) => s.category === 'fuel').length} Fuel</span>
                  <span>·</span>
                  <span>🏨 {r.stops.filter((s) => s.category === 'stay').length} Stay</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Route Highlights Overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Driving Distance" value={`${selectedRoute.totalDistanceKm} km`} sub={`~${selectedRoute.totalDriveHours} hours drive`} />
        <Stat label="Estimated Fuel & Tolls" value={fmt(selectedRoute.budgetBreakdown.fuel + selectedRoute.budgetBreakdown.tolls, 'INR')} sub={`Fuel: ${fmt(selectedRoute.budgetBreakdown.fuel, 'INR')} · Tolls: ${fmt(selectedRoute.budgetBreakdown.tolls, 'INR')}`} />
        <Stat label="Food & Highway Stays" value={fmt(selectedRoute.budgetBreakdown.food + selectedRoute.budgetBreakdown.stay, 'INR')} sub={`Food: ${fmt(selectedRoute.budgetBreakdown.food, 'INR')}`} />
        <Stat label="Total Estimated Budget" value={fmt(selectedRoute.budgetBreakdown.total, 'INR')} sub={`~${fmt(Math.round(selectedRoute.budgetBreakdown.total / Math.max(1, members.length)), 'INR')} / person`} tone="good" />
      </div>

      {/* Interactive 3D Road Map */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              <Compass className="h-5 w-5 text-brand" />
              <span>3D Interactive Road Map: {selectedRoute.title}</span>
            </h2>
            <p className="text-xs text-navy/60">
              Interactive 3D isometric view along the highway with food stops, fuel stations, and scenic overlooks. Click any marker or click "Drive Route" to simulate the journey!
            </p>
          </div>
        </div>

        <RoadMap3D route={selectedRoute} currency="INR" />
      </div>

      {/* "Who Pays What & When" Schedule Table */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-navy flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand" />
              <span>Who Pays What & When (Smart Expense Schedule)</span>
            </h3>
            <p className="text-xs text-navy/60">
              Payments are systematically rotated among group members so no single traveler shoulders heavy initial costs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              downloadCsv(`${selectedRoute.title}-payment-schedule.csv`, [
                ['Day', 'Time', 'KM Marker', 'Stop / Expense', 'Category', 'Location', 'Cost (INR)', 'Assigned Payer', 'Recommended Food / Details'],
                ...selectedRoute.stops.map((s) => [
                  s.day,
                  s.time,
                  `KM ${s.distanceFromStartKm}`,
                  s.title,
                  s.category,
                  s.locationName,
                  s.estimatedCost / 100,
                  s.suggestedPayerName,
                  s.recommendedMenu || s.description,
                ]),
              ]);
            }}
            className="btn-ghost !py-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export Schedule CSV
          </button>
        </div>

        {/* Member Balance Distribution Bar */}
        <div className="rounded-xl border border-black/5 bg-sand/30 p-3">
          <p className="text-xs font-semibold text-navy mb-2">Planned Member Contribution Balance:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(memberPaidTotals).map(([name, amt]) => (
              <div key={name} className="card !p-2 text-center bg-white">
                <span className="text-[11px] text-navy/60 block">{name}</span>
                <span className="text-xs font-bold text-navy">{fmt(amt, 'INR')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chronological Table of Stops */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-black/10 bg-black/5 text-navy/70">
                <th className="p-2.5">Timeline / Distance</th>
                <th className="p-2.5">Stop / Activity</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Location & Food Recommendations</th>
                <th className="p-2.5">Est. Cost</th>
                <th className="p-2.5">Assigned Payer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {selectedRoute.stops.map((s) => (
                <tr key={s.id} className="hover:bg-sand/30 transition">
                  <td className="p-2.5 whitespace-nowrap font-medium">
                    <span className="badge !bg-brand/10 !text-brand text-[10px]">Day {s.day}</span>{' '}
                    <span>{s.time}</span>
                    <span className="block text-[11px] text-navy/50">KM {s.distanceFromStartKm}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-semibold text-navy">{s.title}</span>
                    <p className="text-[11px] text-navy/60">{s.description}</p>
                  </td>
                  <td className="p-2.5">
                    <span className="badge capitalize">{s.category}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-medium text-navy/80">{s.locationName}</span>
                    {s.recommendedMenu && (
                      <p className="mt-0.5 text-[11px] text-amber-700 font-medium">
                        🍽️ {s.recommendedMenu}
                      </p>
                    )}
                  </td>
                  <td className="p-2.5 font-bold text-navy whitespace-nowrap">
                    {s.estimatedCost > 0 ? fmt(s.estimatedCost, 'INR') : 'Free / Included'}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-brand">
                      👤 {s.suggestedPayerName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day-by-Day Road Map Breakdown */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-navy">Day-by-Day Road Map Schedule</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {selectedRoute.days.map((d) => (
            <div key={d.day} className="card space-y-3">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="badge !bg-navy !text-white text-xs font-bold">Day {d.day}</span>
                <span className="text-xs text-navy/60">{d.distanceKm} km drive</span>
              </div>
              <h4 className="text-sm font-bold text-navy">{d.title}</h4>
              <p className="text-xs text-navy/70">
                <b>Route:</b> {d.startPoint} ➔ {d.endPoint}
              </p>

              <div>
                <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide mb-1">Highlights:</p>
                <ul className="space-y-1 text-xs text-navy/80">
                  {d.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-black/5 pt-2">
                <span className="text-[11px] text-navy/50 block">Stops on this day: {d.stops.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
