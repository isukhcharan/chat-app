import React from "react";
import "./Home.css";
import { Link } from "react-router-dom";

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
        <button className="start-chat">
          <Link to="/chat">Start Chat</Link>
        </button>
      </div>
    </div>
  );
}
