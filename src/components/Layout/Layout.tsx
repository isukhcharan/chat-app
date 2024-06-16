import React from "react";
import { Outlet } from "react-router-dom";
import "./Layout.css";
import Header from "./Header/Header";

export default function Layout() {
  return (
    <>
      <Header />
      <main className="main-container">
        <Outlet />
      </main>
    </>
  );
}
