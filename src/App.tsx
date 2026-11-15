import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, TripLayout } from './components/Layouts';
import { Landing, Login, Signup, ResetPassword, Join } from './pages/Public';
import { Dashboard, NewTrip, Notifications, Profile } from './pages/Core';
import { Overview, Members, Destinations, Preferences } from './pages/Planning';
import { Itinerary, OptionsPage } from './pages/Logistics';
import { Expenses, Settlements, Budget } from './pages/Money';
import { Chat, Decisions, Summary } from './pages/Social';
import { RoadTripPlanner } from './pages/RoadTripPlanner';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/join/:inviteCode" element={<Join />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trips/new" element={<NewTrip />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/road-planner" element={<RoadTripPlanner />} />
        <Route path="/settings/profile" element={<Profile />} />
        <Route path="/trips/:tripId" element={<TripLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="road-trip" element={<RoadTripPlanner />} />
          <Route path="members" element={<Members />} />
          <Route path="destinations" element={<Destinations />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="itinerary" element={<Itinerary />} />
          <Route path="transport" element={<OptionsPage kind="transport" />} />
          <Route path="accommodation" element={<OptionsPage kind="accommodation" />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="budget" element={<Budget />} />
          <Route path="chat" element={<Chat />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="summary" element={<Summary />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
