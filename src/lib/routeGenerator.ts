import { uid } from './money';
import type { Category, ItineraryItem, Member } from '../types';

export interface RoadStop {
  id: string;
  day: number;
  time: string;
  title: string;
  category: 'food' | 'fuel' | 'toll' | 'viewpoint' | 'stay' | 'activity';
  distanceFromStartKm: number;
  locationName: string;
  coords: [number, number]; // [lat, lng]
  description: string;
  recommendedMenu?: string;
  estimatedCost: number; // in minor units (paise)
  suggestedPayerId: string;
  suggestedPayerName: string;
  notes?: string;
}

export interface DayRoadSchedule {
  day: number;
  title: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  estimatedDriveTime: string;
  highlights: string[];
  stops: RoadStop[];
}

export interface RouteOption {
  id: string;
  title: string;
  tagline: string;
  viaSummary: string;
  circuitType: 'round-trip' | 'one-way';
  totalDistanceKm: number;
  totalDriveHours: number;
  scenicRating: number; // 1 to 5
  roadCondition: string;
  budgetBreakdown: {
    fuel: number;
    tolls: number;
    food: number;
    stay: number;
    activities: number;
    total: number;
  };
  coordinates: [number, number][];
  stops: RoadStop[];
  days: DayRoadSchedule[];
  origin: string;
  destination: string;
}

export interface GenerateRouteParams {
  origin: string;
  destination: string;
  totalBudget: number; // minor units (paise)
  days: number;
  members: Array<{ id: string; name: string }>;
  currency?: string;
  style?: string;
  isRoundTrip?: boolean;
}

// Distributes expenses fairly among members by picking whoever has paid least so far
function balancePayers(
  stopsWithoutPayer: Omit<RoadStop, 'suggestedPayerId' | 'suggestedPayerName'>[],
  members: Array<{ id: string; name: string }>
): RoadStop[] {
  const memberList = members.length > 0 ? members : [
    { id: 'u1', name: 'Harsha' },
    { id: 'u2', name: 'Ananya' },
    { id: 'u3', name: 'Rohan' },
    { id: 'u4', name: 'Meera' },
  ];

  const runningPaid: Record<string, number> = {};
  memberList.forEach((m) => (runningPaid[m.id] = 0));

  return stopsWithoutPayer.map((s) => {
    if (s.estimatedCost <= 0) {
      return {
        ...s,
        suggestedPayerId: memberList[0].id,
        suggestedPayerName: memberList[0].name,
      };
    }
    let minMember = memberList[0];
    let minAmount = runningPaid[memberList[0].id];
    for (const m of memberList) {
      if (runningPaid[m.id] < minAmount) {
        minAmount = runningPaid[m.id];
        minMember = m;
      }
    }
    runningPaid[minMember.id] += s.estimatedCost;
    return {
      ...s,
      suggestedPayerId: minMember.id,
      suggestedPayerName: minMember.name,
    };
  });
}

export function generateRoadTripRoutes(params: GenerateRouteParams): RouteOption[] {
  const { origin = 'Nellore', destination = 'Munnar, Kerala' } = params;
  const o = origin.toLowerCase().trim();
  const d = destination.toLowerCase().trim();

  const isNelloreToKerala =
    (o.includes('nellore') || o.includes('andhra') || o.includes('tirupati')) &&
    (d.includes('kerala') || d.includes('munnar') || d.includes('wayanad') || d.includes('kochi') || d.includes('alleppey'));

  if (isNelloreToKerala || o.includes('nellore') || d.includes('kerala')) {
    return getNelloreToKeralaRoutes(params);
  }

  return getDynamicRoutes(params);
}

function getNelloreToKeralaRoutes(params: GenerateRouteParams): RouteOption[] {
  const { origin = 'Nellore', destination = 'Munnar, Kerala', members, isRoundTrip: explicitRoundTrip } = params;
  const dLower = (destination || '').toLowerCase();
  const oLower = (origin || '').toLowerCase();
  const hasRoundTripHint =
    dLower.includes('nellore') ||
    dLower.includes('round') ||
    dLower.includes('loop') ||
    dLower.includes('circuit') ||
    (oLower.includes('nellore') && (dLower.includes('kerala') || dLower.includes('munnar') || dLower.includes('wayanad') || dLower.includes('alleppey')));
  const isRoundTrip = explicitRoundTrip !== undefined ? (explicitRoundTrip || hasRoundTripHint) : true;

  // ROUTE 1: Western Ghats Round Trip (Nellore -> Munnar -> Nellore)
  const r1OnwardCoords: [number, number][] = [
    [14.4426, 79.9865], // Nellore
    [14.1463, 79.8504], // Gudur
    [13.7009, 80.0209], // Sulurpeta
    [13.5732, 80.0389], // Tada
    [12.8342, 79.7036], // Kanchipuram
    [12.9165, 79.1325], // Vellore
    [12.6825, 78.6186], // Vaniyambadi
    [12.1211, 78.1582], // Dharmapuri
    [11.6643, 78.1460], // Salem
    [11.3410, 77.7172], // Erode bypass
    [11.0168, 76.9558], // Coimbatore
    [10.6586, 77.0080], // Pollachi
    [10.5847, 77.2472], // Udumalaipettai
    [10.3204, 77.1945], // Chinnar Sanctuary
    [10.2798, 77.1601], // Marayoor
    [10.2014, 77.1124], // Lakkam Falls
    [10.0889, 77.0595], // Munnar (Kerala)
  ];

  const r1ReturnCoords: [number, number][] = [
    [10.0889, 77.0595], // Munnar
    [10.0245, 76.9124], // Cheeyappara Falls
    [10.5847, 77.2472], // Udumalaipettai
    [10.6586, 77.0080], // Pollachi
    [11.0168, 76.9558], // Coimbatore
    [11.3410, 77.7172], // Erode bypass
    [11.6643, 78.1460], // Salem
    [12.1211, 78.1582], // Dharmapuri
    [12.9165, 79.1325], // Vellore
    [12.8342, 79.7036], // Kanchipuram
    [13.5732, 80.0389], // Tada
    [13.7009, 80.0209], // Sulurpeta
    [14.1463, 79.8504], // Gudur
    [14.4426, 79.9865], // Back in Nellore
  ];

  const r1FullCoords = isRoundTrip ? [...r1OnwardCoords, ...r1ReturnCoords] : r1OnwardCoords;

  const r1RawStops: Omit<RoadStop, 'suggestedPayerId' | 'suggestedPayerName'>[] = [
    // DAY 1: ONWARD JOURNEY (NELLORE -> KERALA)
    {
      id: uid(),
      day: 1,
      time: '07:30',
      title: 'Grand Highway Kitchen (Breakfast)',
      category: 'food',
      distanceFromStartKm: 110,
      locationName: 'Sulurpeta / Tada NH16 Bypass',
      coords: [13.7009, 80.0209],
      description: 'Clean air-conditioned family highway eatery with spotless restrooms.',
      recommendedMenu: 'Ghee Podi Thatte Idli, Crispy Masala Dosa, Filter Coffee',
      estimatedCost: 95000,
    },
    {
      id: uid(),
      day: 1,
      time: '09:15',
      title: 'Surapalli & Sriperumbudur Tolls',
      category: 'toll',
      distanceFromStartKm: 195,
      locationName: 'Chennai-Bengaluru NH48',
      coords: [13.0033, 79.8821],
      description: 'FASTag electronic toll plaza on 6-lane express highway.',
      estimatedCost: 34000,
    },
    {
      id: uid(),
      day: 1,
      time: '10:45',
      title: 'Indian Oil Swagat Oasis (Fuel & Rest)',
      category: 'fuel',
      distanceFromStartKm: 265,
      locationName: 'Vellore Bypass NH48',
      coords: [12.9165, 79.1325],
      description: 'Full-tank fuel refill, tire air pressure check, cold tender coconut.',
      estimatedCost: 380000,
    },
    {
      id: uid(),
      day: 1,
      time: '13:15',
      title: 'Sri Saravana Bhavan Elite (Highway Lunch)',
      category: 'food',
      distanceFromStartKm: 410,
      locationName: 'Salem NH Bypass',
      coords: [11.6643, 78.1460],
      description: 'Renowned highway halt for authentic Tamil & South Indian meals.',
      recommendedMenu: 'Special Meals Thali, Paneer Butter Masala, Fresh Lime Soda',
      estimatedCost: 175000,
    },
    {
      id: uid(),
      day: 1,
      time: '16:00',
      title: 'BPCL Pollachi Highway Fuel & Tea',
      category: 'fuel',
      distanceFromStartKm: 535,
      locationName: 'Pollachi Road Bypass',
      coords: [10.6586, 77.0080],
      description: 'Final fuel top-up before the 45km mountain ghat climb; tea and banana chips.',
      estimatedCost: 260000,
    },
    {
      id: uid(),
      day: 1,
      time: '17:45',
      title: 'Lakkam Waterfalls & Marayoor Viewpoint',
      category: 'viewpoint',
      distanceFromStartKm: 615,
      locationName: 'Chinnar - Munnar Ghat Road',
      coords: [10.2014, 77.1124],
      description: 'Misty mountain waterfall viewpoint, cool evening breeze and photo stop.',
      estimatedCost: 20000,
    },
    {
      id: uid(),
      day: 1,
      time: '19:30',
      title: 'Misty Valley Tea Estate Resort (Check-in)',
      category: 'stay',
      distanceFromStartKm: 685,
      locationName: 'Old Munnar, Kerala',
      coords: [10.0889, 77.0595],
      description: 'Spacious cottage amidst lush tea plantations. Advance resort booking.',
      estimatedCost: 850000,
    },
    {
      id: uid(),
      day: 1,
      time: '20:30',
      title: 'Rapsy / Hill Spice Court (Kerala Dinner)',
      category: 'food',
      distanceFromStartKm: 688,
      locationName: 'Munnar Town Center',
      coords: [10.0844, 77.0620],
      description: 'Celebratory Kerala road-trip arrival dinner with traditional breads and curries.',
      recommendedMenu: 'Appam with Vegetable Stew, Malabar Parotta, Kerala Veg Biryani',
      estimatedCost: 185000,
    },

    // DAY 2: KERALA EXPLORATION & LOCAL WONDERS
    {
      id: uid(),
      day: 2,
      time: '09:00',
      title: 'Eravikulam National Park Safari',
      category: 'activity',
      distanceFromStartKm: 700,
      locationName: 'Rajamalai, Munnar',
      coords: [10.1983, 77.0456],
      description: 'Home of the endangered Nilgiri Tahr mountain goat; breathtaking peak views.',
      estimatedCost: 140000,
    },
    {
      id: uid(),
      day: 2,
      time: '13:00',
      title: 'Lunch at Saravana Surabhi, Munnar',
      category: 'food',
      distanceFromStartKm: 710,
      locationName: 'Munnar Colony Road',
      coords: [10.0877, 77.0601],
      description: 'Authentic Kerala thali with red rice, aviyal, sambar, and payasam.',
      recommendedMenu: 'Kerala Sadya Lunch, Mango Lassi, Hot Filter Kaapi',
      estimatedCost: 150000,
    },
    {
      id: uid(),
      day: 2,
      time: '15:00',
      title: 'Mattupetty Dam Speedboating & Echo Point',
      category: 'activity',
      distanceFromStartKm: 725,
      locationName: 'Mattupetty, Munnar',
      coords: [10.1062, 77.1245],
      description: 'Lake speedboating in the cool mountain water surrounded by mist.',
      estimatedCost: 160000,
    },
    {
      id: uid(),
      day: 2,
      time: '18:00',
      title: 'KDHP Tea Museum & Spice Plantation Tour',
      category: 'activity',
      distanceFromStartKm: 735,
      locationName: 'Nullatanni, Munnar',
      coords: [10.0912, 77.0519],
      description: 'Fresh cardamom, pepper, and tea tasting session; shopping for natural spices.',
      estimatedCost: 80000,
    },
    {
      id: uid(),
      day: 2,
      time: '20:15',
      title: 'Homestay Campfire & Barbecue Dinner',
      category: 'food',
      distanceFromStartKm: 740,
      locationName: 'Misty Valley Homestay',
      coords: [10.0889, 77.0595],
      description: 'Warm night campfire in the chilly Munnar hills with grilled dinner.',
      recommendedMenu: 'Grilled Veg Kebabs, Butter Roti, Dal Tadka, Hot Gulab Jamun',
      estimatedCost: 190000,
    },

    // DAY 3: RETURN JOURNEY (KERALA -> NELLORE)
    {
      id: uid(),
      day: 3,
      time: '07:00',
      title: 'Check-out & Morning Tea in Munnar',
      category: 'stay',
      distanceFromStartKm: 745,
      locationName: 'Munnar Resort',
      coords: [10.0889, 77.0595],
      description: 'Early morning mountain departure with fresh hot tea.',
      estimatedCost: 35000,
    },
    {
      id: uid(),
      day: 3,
      time: '08:30',
      title: 'Cheeyappara & Valara Waterfalls (Photo Stop)',
      category: 'viewpoint',
      distanceFromStartKm: 810,
      locationName: 'Kochi-Dhanushkodi Highway',
      coords: [10.0245, 76.9124],
      description: 'Scenic waterfall photo stop on the descent back towards the plains.',
      estimatedCost: 20000,
    },
    {
      id: uid(),
      day: 3,
      time: '10:45',
      title: 'HPCL Swastik Fuel & Tire Check',
      category: 'fuel',
      distanceFromStartKm: 920,
      locationName: 'Pollachi-Coimbatore Road',
      coords: [10.6586, 77.0080],
      description: 'Fuel top-up and tire pressure calibration for highway speeds.',
      estimatedCost: 340000,
    },
    {
      id: uid(),
      day: 3,
      time: '13:00',
      title: 'Coimbatore Sree Annapoorna (Return Highway Lunch)',
      category: 'food',
      distanceFromStartKm: 990,
      locationName: 'Coimbatore Avinashi Highway',
      coords: [11.0168, 76.9558],
      description: 'Legendary Annapoorna sambar and roasted ghee roasts on the way back.',
      recommendedMenu: 'Annapoorna Ghee Roast Dosa, Chole Bhature, Special Filter Coffee',
      estimatedCost: 175000,
    },
    {
      id: uid(),
      day: 3,
      time: '15:45',
      title: 'Salem & Dharmapuri Return Express Tolls',
      category: 'toll',
      distanceFromStartKm: 1140,
      locationName: 'Salem NH44 Toll Plaza',
      coords: [11.6643, 78.1460],
      description: 'FASTag electronic toll clearances on return stretch.',
      estimatedCost: 42000,
    },
    {
      id: uid(),
      day: 3,
      time: '18:00',
      title: 'A2B Ananda Bhavan Vellore (Snacks & Kaapi)',
      category: 'food',
      distanceFromStartKm: 1260,
      locationName: 'Vellore Bypass NH48',
      coords: [12.9165, 79.1325],
      description: 'Evening tea break with hot Mysore Pak, Murukku and Filter Kaapi.',
      recommendedMenu: 'Hot Sambar Vada, Onion Pakoda, South Indian Filter Coffee',
      estimatedCost: 85000,
    },
    {
      id: uid(),
      day: 3,
      time: '19:45',
      title: 'Tada Highway Fuel Top-up',
      category: 'fuel',
      distanceFromStartKm: 1350,
      locationName: 'Tada Highway Oasis',
      coords: [13.5732, 80.0389],
      description: 'Final fuel top-up before concluding the return leg.',
      estimatedCost: 220000,
    },
    {
      id: uid(),
      day: 3,
      time: '21:30',
      title: 'Safe Return to Nellore & Celebration Dinner',
      category: 'food',
      distanceFromStartKm: 1420,
      locationName: 'Nellore Grand / Komala Vilas',
      coords: [14.4426, 79.9865],
      description: 'Safe arrival back in Nellore; group dinner celebrating the 1,400+ km circuit.',
      recommendedMenu: 'Nellore Ghee Dosa, Pulao, Paneer Curry & Ice Cream',
      estimatedCost: 160000,
    },
  ];

  const r1BalancedStops = balancePayers(r1RawStops, members);

  const route1: RouteOption = {
    id: 'route-munnar-roundtrip',
    title: 'Nellore ➔ Munnar (Kerala) ➔ Nellore Round-Trip Highway Circuit',
    tagline: 'Complete 3-day loop: Nellore to Kerala hills and back with all food & fuel stops',
    viaSummary: 'Nellore ➔ Vellore ➔ Salem ➔ Coimbatore ➔ Munnar ➔ Return to Nellore',
    circuitType: isRoundTrip ? 'round-trip' : 'one-way',
    totalDistanceKm: isRoundTrip ? 1420 : 685,
    totalDriveHours: isRoundTrip ? 25 : 12.5,
    scenicRating: 5.0,
    roadCondition: 'Smooth 4-lane NH16/NH48 + Scenic Ghat Roads (NH85)',
    budgetBreakdown: {
      fuel: 1200000,
      tolls: 76000,
      food: 1195000,
      stay: 885000,
      activities: 380000,
      total: 3736000,
    },
    coordinates: r1FullCoords,
    stops: r1BalancedStops,
    origin: 'Nellore',
    destination: 'Munnar, Kerala (Round-Trip to Nellore)',
    days: [
      {
        day: 1,
        title: 'Onward Highway Drive: Nellore to Munnar Hills',
        startPoint: 'Nellore (05:30 AM)',
        endPoint: 'Munnar Resort (07:30 PM)',
        distanceKm: 685,
        estimatedDriveTime: '12h 30m',
        highlights: ['Sulurpeta breakfast', 'Vellore fuel stop', 'Salem Saravana Bhavan lunch', 'Scenic Marayoor ghat climb', 'Kerala welcome dinner'],
        stops: r1BalancedStops.filter((s) => s.day === 1),
      },
      {
        day: 2,
        title: 'Kerala Exploration: Tea Estates, Safari & Campfire',
        startPoint: 'Munnar Resort',
        endPoint: 'Munnar Town & Campfire',
        distanceKm: 50,
        estimatedDriveTime: '2h',
        highlights: ['Nilgiri Tahr mountain safari', 'Traditional Kerala Sadya lunch', 'Mattupetty speedboating', 'Night campfire & barbecue'],
        stops: r1BalancedStops.filter((s) => s.day === 2),
      },
      {
        day: 3,
        title: 'Return Road Trip: Munnar Hills back to Nellore',
        startPoint: 'Munnar Resort (07:00 AM)',
        endPoint: 'Nellore Safe Return (09:30 PM)',
        distanceKm: 685,
        estimatedDriveTime: '12h 30m',
        highlights: ['Waterfall photo stop', 'Coimbatore Annapoorna lunch', 'A2B Vellore evening filter coffee', 'Return celebration dinner at Nellore'],
        stops: r1BalancedStops.filter((s) => s.day === 3),
      },
    ],
  };

  // ROUTE 2: Wayanad Rainforest Safari Loop (Nellore -> Wayanad -> Nellore)
  const r2OnwardCoords: [number, number][] = [
    [14.4426, 79.9865], // Nellore
    [13.6288, 79.4192], // Tirupati
    [13.2172, 79.1003], // Chittoor
    [12.5266, 78.2146], // Krishnagiri
    [12.2958, 76.6394], // Mysuru
    [11.6664, 76.6291], // Bandipur Forest
    [11.6854, 76.2629], // Sultan Bathery
    [11.6050, 76.0828], // Wayanad
  ];

  const r2ReturnCoords: [number, number][] = [
    [11.6050, 76.0828], // Wayanad
    [11.6854, 76.2629], // Sultan Bathery
    [12.2958, 76.6394], // Mysuru
    [12.5266, 78.2146], // Krishnagiri
    [13.2172, 79.1003], // Chittoor
    [13.6288, 79.4192], // Tirupati
    [14.4426, 79.9865], // Nellore
  ];

  const r2FullCoords = isRoundTrip ? [...r2OnwardCoords, ...r2ReturnCoords] : r2OnwardCoords;

  const r2RawStops: Omit<RoadStop, 'suggestedPayerId' | 'suggestedPayerName'>[] = [
    {
      id: uid(),
      day: 1,
      time: '07:30',
      title: 'Bhimas Deluxe Heritage Breakfast',
      category: 'food',
      distanceFromStartKm: 135,
      locationName: 'Tirupati Bypass Road',
      coords: [13.6288, 79.4192],
      description: 'Famous temple city breakfast with piping hot Ghee Pongal and Vada.',
      recommendedMenu: 'Ghee Sambar Vada, Rava Dosa, Sweet Pongal, Mysore Filter Coffee',
      estimatedCost: 90000,
    },
    {
      id: uid(),
      day: 1,
      time: '11:00',
      title: 'Krishnagiri Fuel & Tolls',
      category: 'fuel',
      distanceFromStartKm: 270,
      locationName: 'Krishnagiri NH44 Toll Plaza',
      coords: [12.5266, 78.2146],
      description: 'Tank refill and FASTag tolls on Bangalore-Salem connector.',
      estimatedCost: 360000,
    },
    {
      id: uid(),
      day: 1,
      time: '13:45',
      title: 'Hotel RRR & Mylari Special Lunch',
      category: 'food',
      distanceFromStartKm: 440,
      locationName: 'Mysuru City Road',
      coords: [12.2958, 76.6394],
      description: 'Authentic royal Mysuru lunch halt before entering the forest zone.',
      recommendedMenu: 'Mysuru Biryani, Original Mylari Dosa with butter, Filter Coffee',
      estimatedCost: 170000,
    },
    {
      id: uid(),
      day: 1,
      time: '16:00',
      title: 'Bandipur Tiger Reserve Jungle Drive',
      category: 'viewpoint',
      distanceFromStartKm: 510,
      locationName: 'Bandipur National Park Highway',
      coords: [11.6664, 76.6291],
      description: 'Slow 30km/h forest corridor drive with deer and wild elephant sightings.',
      estimatedCost: 30000,
    },
    {
      id: uid(),
      day: 1,
      time: '18:30',
      title: 'Wayanad Rainforest Treehouse Resort (Check-in)',
      category: 'stay',
      distanceFromStartKm: 590,
      locationName: 'Vythiri, Wayanad',
      coords: [11.6050, 76.0828],
      description: 'Eco-resort nestled among bamboo trees and coffee plantations.',
      estimatedCost: 880000,
    },
    {
      id: uid(),
      day: 1,
      time: '20:00',
      title: 'Malabar Spice Garden Dinner',
      category: 'food',
      distanceFromStartKm: 592,
      locationName: 'Vythiri, Wayanad',
      coords: [11.5512, 76.0421],
      description: 'Traditional Malabar dinner featuring coconut gravies and freshly baked breads.',
      recommendedMenu: 'Pathiri with Veg Stew, Malabar Parotta, Coconut Payasam',
      estimatedCost: 165000,
    },
    // Day 2
    {
      id: uid(),
      day: 2,
      time: '09:30',
      title: 'Banasura Sagar Dam & Bamboo Rafting',
      category: 'activity',
      distanceFromStartKm: 630,
      locationName: 'Padinjarathara, Wayanad',
      coords: [11.6698, 75.9575],
      description: 'Largest earth dam in India with island speedboating and zip-lining.',
      estimatedCost: 180000,
    },
    // Day 3 (Return)
    {
      id: uid(),
      day: 3,
      time: '08:00',
      title: 'Wayanad Departure & Return Jungle Drive',
      category: 'viewpoint',
      distanceFromStartKm: 690,
      locationName: 'Bandipur-Mysore Highway',
      coords: [11.6664, 76.6291],
      description: 'Morning forest drive through Bandipur on the return leg.',
      estimatedCost: 20000,
    },
    {
      id: uid(),
      day: 3,
      time: '13:00',
      title: 'Mysore Highway Return Lunch',
      category: 'food',
      distanceFromStartKm: 810,
      locationName: 'Mysore-Bangalore Highway',
      coords: [12.2958, 76.6394],
      description: 'Delicious lunch break on the return highway.',
      estimatedCost: 160000,
    },
    {
      id: uid(),
      day: 3,
      time: '18:00',
      title: 'Tirupati Coffee & Return to Nellore',
      category: 'food',
      distanceFromStartKm: 1120,
      locationName: 'Tirupati-Nellore NH71',
      coords: [13.6288, 79.4192],
      description: 'Evening tea and safe arrival back in Nellore.',
      estimatedCost: 140000,
    },
  ];

  const r2BalancedStops = balancePayers(r2RawStops, members);

  const route2: RouteOption = {
    id: 'route-wayanad-roundtrip',
    title: 'Nellore ➔ Wayanad (Kerala) ➔ Nellore Rainforest Loop',
    tagline: 'Best for forest wildlife drives, bamboo treehouses & authentic Malabar cuisine',
    viaSummary: 'Nellore ➔ Tirupati ➔ Mysore ➔ Bandipur Forest ➔ Wayanad ➔ Nellore',
    circuitType: isRoundTrip ? 'round-trip' : 'one-way',
    totalDistanceKm: isRoundTrip ? 1220 : 590,
    totalDriveHours: isRoundTrip ? 23 : 11.5,
    scenicRating: 4.8,
    roadCondition: 'Smooth Highway + Forest Corridor (Bandipur speed limits 30km/h)',
    budgetBreakdown: {
      fuel: 1040000,
      tolls: 62000,
      food: 1020000,
      stay: 880000,
      activities: 320000,
      total: 3322000,
    },
    coordinates: r2FullCoords,
    stops: r2BalancedStops,
    origin: 'Nellore',
    destination: 'Wayanad, Kerala (Round-Trip to Nellore)',
    days: [
      {
        day: 1,
        title: 'Nellore to Wayanad Rainforest Drive',
        startPoint: 'Nellore (05:30 AM)',
        endPoint: 'Wayanad Treehouse (06:30 PM)',
        distanceKm: 590,
        estimatedDriveTime: '11h 30m',
        highlights: ['Tirupati Bhimas breakfast', 'Mysore royal lunch', 'Bandipur jungle drive', 'Malabar dinner'],
        stops: r2BalancedStops.filter((s) => s.day === 1),
      },
      {
        day: 2,
        title: 'Banasura Dam, Bamboo Rafting & Treehouses',
        startPoint: 'Wayanad Resort',
        endPoint: 'Coffee Plantation Walk',
        distanceKm: 55,
        estimatedDriveTime: '2h',
        highlights: ['Island speedboat ride', 'Neolithic cave walk', 'Treehouse coffee tasting'],
        stops: r2BalancedStops.filter((s) => s.day === 2),
      },
      {
        day: 3,
        title: 'Return Journey: Wayanad back to Nellore',
        startPoint: 'Wayanad (08:00 AM)',
        endPoint: 'Nellore Safe Return (08:30 PM)',
        distanceKm: 590,
        estimatedDriveTime: '11h 30m',
        highlights: ['Morning forest safari drive', 'Mysore highway lunch', 'Tirupati filter coffee', 'Safe return home'],
        stops: r2BalancedStops.filter((s) => s.day === 3),
      },
    ],
  };

  // ROUTE 3: Backwaters & Coastal Loop (Nellore -> Alleppey -> Nellore)
  const r3OnwardCoords: [number, number][] = [
    [14.4426, 79.9865], // Nellore
    [13.0827, 80.2707], // Chennai bypass
    [11.9401, 79.8083], // Villupuram
    [10.7905, 78.7047], // Trichy
    [9.9252, 78.1198],  // Madurai
    [9.5916, 77.1606],  // Thekkady
    [9.4981, 76.3388],  // Alleppey
  ];

  const r3ReturnCoords: [number, number][] = [
    [9.4981, 76.3388],  // Alleppey
    [9.9252, 78.1198],  // Madurai
    [10.7905, 78.7047], // Trichy
    [11.9401, 79.8083], // Villupuram
    [13.0827, 80.2707], // Chennai bypass
    [14.4426, 79.9865], // Nellore
  ];

  const r3FullCoords = isRoundTrip ? [...r3OnwardCoords, ...r3ReturnCoords] : r3OnwardCoords;

  const r3RawStops: Omit<RoadStop, 'suggestedPayerId' | 'suggestedPayerName'>[] = [
    {
      id: uid(),
      day: 1,
      time: '08:00',
      title: 'Murugan Idli Shop (Highway Breakfast)',
      category: 'food',
      distanceFromStartKm: 165,
      locationName: 'Chennai Outer Ring Road',
      coords: [13.0033, 80.1245],
      description: 'Steaming soft idlis served with 4 varieties of fresh chutneys and podi.',
      recommendedMenu: 'Malli Ghee Idli, Onion Uthappam, Jigarthanda drink',
      estimatedCost: 95000,
    },
    {
      id: uid(),
      day: 1,
      time: '13:00',
      title: 'Dindigul Thalappakatti / Venu Lunch',
      category: 'food',
      distanceFromStartKm: 460,
      locationName: 'Dindigul Bypass NH44',
      coords: [10.3673, 77.9803],
      description: 'Legendary Seeraga Samba rice Biryani halt.',
      recommendedMenu: 'Dindigul Special Biryani, Veg Pepper Fry, Rose Milk',
      estimatedCost: 180000,
    },
    {
      id: uid(),
      day: 1,
      time: '18:30',
      title: 'Alleppey Private Houseboat Check-in',
      category: 'stay',
      distanceFromStartKm: 730,
      locationName: 'Vembanad Lake, Alleppey',
      coords: [9.4981, 76.3388],
      description: 'Traditional wooden Kettuvallam houseboat cruise across serene backwaters.',
      estimatedCost: 1100000,
    },
    {
      id: uid(),
      day: 1,
      time: '20:00',
      title: 'Houseboat Backwater Candlelight Dinner',
      category: 'food',
      distanceFromStartKm: 730,
      locationName: 'Onboard Alleppey Houseboat',
      coords: [9.4981, 76.3388],
      description: 'Freshly prepared Kerala backwater delicacies cooked by private onboard chef.',
      recommendedMenu: 'Kerala Rice, Sambar, Aviyal, Thoran, Banana Fritters',
      estimatedCost: 150000,
    },
    // Return Day 3
    {
      id: uid(),
      day: 3,
      time: '08:00',
      title: 'Alleppey Departure & Thekkady Spice Drive',
      category: 'viewpoint',
      distanceFromStartKm: 850,
      locationName: 'Thekkady Mountain Road',
      coords: [9.5916, 77.1606],
      description: 'Scenic drive through cardamom hills on return journey.',
      estimatedCost: 30000,
    },
    {
      id: uid(),
      day: 3,
      time: '13:30',
      title: 'Madurai Heritage Return Lunch',
      category: 'food',
      distanceFromStartKm: 1020,
      locationName: 'Madurai Bypass Road',
      coords: [9.9252, 78.1198],
      description: 'Famous Madurai meals with traditional flavors.',
      estimatedCost: 170000,
    },
    {
      id: uid(),
      day: 3,
      time: '20:30',
      title: 'Safe Return to Nellore',
      category: 'food',
      distanceFromStartKm: 1480,
      locationName: 'Nellore Town Center',
      coords: [14.4426, 79.9865],
      description: 'Concluding the Alleppey coastal circuit safely in Nellore.',
      estimatedCost: 150000,
    },
  ];

  const r3BalancedStops = balancePayers(r3RawStops, members);

  const route3: RouteOption = {
    id: 'route-alleppey-roundtrip',
    title: 'Nellore ➔ Alleppey (Kerala) ➔ Nellore Coastal Backwaters Loop',
    tagline: 'Best for Kerala houseboat cruises, lake sunsets & southern culinary trail',
    viaSummary: 'Nellore ➔ Chennai bypass ➔ Madurai ➔ Alleppey ➔ Return to Nellore',
    circuitType: isRoundTrip ? 'round-trip' : 'one-way',
    totalDistanceKm: isRoundTrip ? 1480 : 730,
    totalDriveHours: isRoundTrip ? 27 : 13.5,
    scenicRating: 4.9,
    roadCondition: 'Multi-lane Highway (NH44/NH183) + Waterway Cruise Access',
    budgetBreakdown: {
      fuel: 1280000,
      tolls: 88000,
      food: 1120000,
      stay: 1100000,
      activities: 450000,
      total: 4038000,
    },
    coordinates: r3FullCoords,
    stops: r3BalancedStops,
    origin: 'Nellore',
    destination: 'Alleppey, Kerala (Round-Trip to Nellore)',
    days: [
      {
        day: 1,
        title: 'Nellore to Alleppey Houseboat Drive',
        startPoint: 'Nellore (05:00 AM)',
        endPoint: 'Alleppey Lake (06:30 PM)',
        distanceKm: 730,
        estimatedDriveTime: '13h 30m',
        highlights: ['Murugan Idli breakfast', 'Madurai highway lunch', 'Houseboat backwater check-in'],
        stops: r3BalancedStops.filter((s) => s.day === 1),
      },
      {
        day: 2,
        title: 'Vembanad Backwaters Cruise & Beach Sunset',
        startPoint: 'Alleppey Houseboat',
        endPoint: 'Marari Beach Resort',
        distanceKm: 40,
        estimatedDriveTime: '1h 30m',
        highlights: ['Morning backwater boat cruise', 'Kerala toddy shop snacks', 'Arabian Sea sunset'],
        stops: r3BalancedStops.filter((s) => s.day === 2),
      },
      {
        day: 3,
        title: 'Return Road Journey: Alleppey back to Nellore',
        startPoint: 'Alleppey (07:30 AM)',
        endPoint: 'Nellore Safe Return (09:30 PM)',
        distanceKm: 730,
        estimatedDriveTime: '13h 30m',
        highlights: ['Thekkady spice hill drive', 'Madurai heritage lunch', 'Safe return home to Nellore'],
        stops: r3BalancedStops.filter((s) => s.day === 3),
      },
    ],
  };

  return [route1, route2, route3];
}

// Fallback dynamic generator for any user-inputted cities
function getDynamicRoutes(params: GenerateRouteParams): RouteOption[] {
  const { origin, destination, members, isRoundTrip = true } = params;

  const startLat = 13.0827;
  const startLng = 80.2707;
  const endLat = 9.9312;
  const endLng = 76.2673;

  const steps = 8;
  const coords1: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    coords1.push([startLat + (endLat - startLat) * f + Math.sin(f * Math.PI) * 0.4, startLng + (endLng - startLng) * f]);
  }
  if (isRoundTrip) {
    for (let i = steps; i >= 0; i--) {
      const f = i / steps;
      coords1.push([startLat + (endLat - startLat) * f - Math.sin(f * Math.PI) * 0.4, startLng + (endLng - startLng) * f]);
    }
  }

  const rawStops: Omit<RoadStop, 'suggestedPayerId' | 'suggestedPayerName'>[] = [
    {
      id: uid(),
      day: 1,
      time: '08:00',
      title: 'Highway Express Restaurant (Breakfast)',
      category: 'food',
      distanceFromStartKm: 95,
      locationName: 'Highway Hub Plaza',
      coords: coords1[1],
      description: 'Hot breakfast and fresh coffee stop.',
      recommendedMenu: 'Idli, Dosa, Poha & Coffee',
      estimatedCost: 85000,
    },
    {
      id: uid(),
      day: 1,
      time: '11:00',
      title: 'NH Express Fuel Oasis',
      category: 'fuel',
      distanceFromStartKm: 220,
      locationName: 'Highway Fuel Station',
      coords: coords1[3],
      description: 'Fuel top-up and tire pressure check.',
      estimatedCost: 340000,
    },
    {
      id: uid(),
      day: 1,
      time: '13:30',
      title: 'Green Meadows Highway Dining (Lunch)',
      category: 'food',
      distanceFromStartKm: 340,
      locationName: 'Central Junction Plaza',
      coords: coords1[4],
      description: 'Hearty lunch with local delicacies.',
      recommendedMenu: 'Regional Thali & Coolers',
      estimatedCost: 160000,
    },
    {
      id: uid(),
      day: 1,
      time: '18:30',
      title: `${destination} Heritage Stay (Check-in)`,
      category: 'stay',
      distanceFromStartKm: 520,
      locationName: destination,
      coords: coords1[7],
      description: 'Check-in to reserved accommodation.',
      estimatedCost: 750000,
    },
    {
      id: uid(),
      day: 1,
      time: '20:15',
      title: 'Welcome Dinner with Group',
      category: 'food',
      distanceFromStartKm: 522,
      locationName: `${destination} Town Center`,
      coords: coords1[8],
      description: 'Group dinner to kick off the trip.',
      recommendedMenu: 'Chef Special Platter',
      estimatedCost: 170000,
    },
    {
      id: uid(),
      day: 3,
      time: '13:00',
      title: `Return Highway Lunch on way to ${origin}`,
      category: 'food',
      distanceFromStartKm: 850,
      locationName: 'Return Highway Express',
      coords: coords1[4],
      description: 'Highway lunch on return journey.',
      estimatedCost: 160000,
    },
    {
      id: uid(),
      day: 3,
      time: '20:00',
      title: `Safe Return to ${origin} (Celebration Dinner)`,
      category: 'food',
      distanceFromStartKm: 1040,
      locationName: origin,
      coords: coords1[0],
      description: 'Safe arrival back home.',
      estimatedCost: 150000,
    },
  ];

  const balancedStops = balancePayers(rawStops, members);

  return [
    {
      id: 'dynamic-opt-1',
      title: `${origin} ➔ ${destination} ➔ ${origin} Round-Trip Highway Circuit`,
      tagline: `Complete round-trip journey from ${origin} to ${destination} and back with food stops`,
      viaSummary: `${origin} ➔ Central Corridor ➔ ${destination} ➔ Return to ${origin}`,
      circuitType: isRoundTrip ? 'round-trip' : 'one-way',
      totalDistanceKm: isRoundTrip ? 1080 : 540,
      totalDriveHours: isRoundTrip ? 19 : 9.5,
      scenicRating: 4.7,
      roadCondition: '4-lane National Highway',
      budgetBreakdown: {
        fuel: 1100000,
        tolls: 55000,
        food: 920000,
        stay: 750000,
        activities: 300000,
        total: 3125000,
      },
      coordinates: coords1,
      stops: balancedStops,
      origin,
      destination: isRoundTrip ? `${destination} (Round-Trip to ${origin})` : destination,
      days: [
        {
          day: 1,
          title: `Road Journey from ${origin} to ${destination}`,
          startPoint: `${origin} (06:00 AM)`,
          endPoint: `${destination} (06:30 PM)`,
          distanceKm: 540,
          estimatedDriveTime: '9h 30m',
          highlights: ['Morning breakfast stop', 'Highway lunch halt', 'Evening arrival and stay check-in'],
          stops: balancedStops.filter((s) => s.day === 1),
        },
        {
          day: 3,
          title: `Return Road Journey from ${destination} to ${origin}`,
          startPoint: `${destination} (08:00 AM)`,
          endPoint: `${origin} Safe Return (08:30 PM)`,
          distanceKm: 540,
          estimatedDriveTime: '9h 30m',
          highlights: ['Return scenic drive', 'Highway lunch halt', 'Safe return home celebration'],
          stops: balancedStops.filter((s) => s.day === 3),
        },
      ],
    },
  ];
}
