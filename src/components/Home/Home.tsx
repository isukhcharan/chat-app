import React from "react";
import "./Home.css";
import { Link } from "react-router-dom";
import Login from "../Login/Login";

export default function Home() {
  return (
    <div className="home-container">
      <div className="about">
        <h2>Welcome to ChatterBox</h2>
        <p>
          Where new connections are just a click away! Discover a world of
          conversations with strangers from all corners of the globe. Whether
          you're looking to make new friends, exchange ideas, or simply have a
          fun chat, ChatterBox is your gateway to endless possibilities. Our
          user-friendly interface and secure platform ensure a seamless and safe
          chatting experience. Dive into engaging discussions, explore different
          cultures, and broaden your horizons – one chat at a time.
        </p>
        <Link className="btn btn-icon btn-green start-chat" to="/chat">
          <span className="material-symbols-outlined">shuffle</span>
          <span>Random Chat</span>
        </Link>
      </div>

      <div className="or"></div>

      <div className="login-signup">
        <Login/>

        <div className="text-bold p-1">OR</div>

        <button className="btn btn-blue" type="button">
          Create Account
        </button>
      </div>

      {/* <Footer /> */}
    </div>
  );
}
