import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "./lib/stripe";
import { installAuthSession401Handler } from "./lib/authSession";

import Login from "./Login";
import SignUp from "./SignUp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Dashboard from "./Dashboard";
import RunnerDashboard from "./RunnerDashboard";


////////////////////////////////////////////////////////
// ðŸ” TOKEN DECODER (SAFE)
////////////////////////////////////////////////////////

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));


    return decoded;
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (typeof localStorage === "undefined") {
      return null;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const decoded = decodeToken(token);

    if (!decoded || !decoded.userId) {
      console.warn("Invalid token structure");
      return null;
    }

    return {
      id: decoded.userId,
      role: decoded.role,
    };
  });

  useEffect(() => {
    return installAuthSession401Handler({
      onSessionExpired() {
        setUser(null);
      },
    });
  }, []);
  const [loading] = useState(false);
  ////////////////////////////////////////////////////////
  // INITIAL SESSION IS DERIVED SYNCHRONOUSLY ABOVE.
  ////////////////////////////////////////////////////////
  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  ////////////////////////////////////////////////////////
  // â³ LOADING STATE
  ////////////////////////////////////////////////////////

  if (window.location.pathname === "/signup") {
    return <SignUp />;
  }

  if (window.location.pathname === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPassword />;
  }
  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  ////////////////////////////////////////////////////////
  // ðŸ” LOGIN SCREEN
  ////////////////////////////////////////////////////////

  if (!user) {
    return <Login setUser={setUser} />;
  }
  return (
    <Elements stripe={stripePromise}>
      {user.role === "runner" ? (
        <RunnerDashboard user={user} onLogout={handleLogout} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </Elements>
  );
}