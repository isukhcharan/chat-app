import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import "./Layout.css";

const getPreferredScheme = () =>
  window?.matchMedia?.("(prefers-color-scheme:dark)")?.matches
    ? "dark"
    : "light";

export default function Layout() {
  const [theme, setTheme] = useState<string>(
    localStorage.getItem("theme") || getPreferredScheme()
  );

  if (window?.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        setTheme(event.matches ? "dark" : "light");
      });
  }

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    document.documentElement.setAttribute("data-color-scheme", theme);
    localStorage.setItem("theme", theme);
    return () => {};
  }, [theme]);

  function changeTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <>
      <header className="layout">
        <nav className="navbar">
          <a className="home-link" href="/">
            <img width={30} src="favicon.ico" alt="chatterbox" />
            <span>ChatterBox</span>
          </a>

          <div className="nav-link-container">
            <button onClick={changeTheme} className="theme-button">
              <span className="material-symbols-outlined">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
          </div>
        </nav>
      </header>
      <main className="main-container">
        <Outlet />
      </main>
    </>
  );
}
