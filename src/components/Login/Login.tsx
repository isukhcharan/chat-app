import React from "react";
import "./Login.css";
import { login } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  
  const handleSubmission = (event: React.FormEvent) => {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    let username = data.get("username")?.toString()?.trim();
    let password = data.get("password")?.toString()?.trim();

    if (username && password) {
      login(username, password)
        .then(() => navigate("/chat"))
        .catch((err) => console.error(err));
    } else {
      // manage popup
    }
  };

  return (
    <form onSubmit={handleSubmission} className="login">
      <input
        type="text"
        id="username"
        name="username"
        placeholder="Username"
        required
      />

      <input
        type="password"
        name="password"
        id="password"
        placeholder="Password"
        required
      />

      <div className="d-flex justify-content-center align-items-center">
        <button className="btn btn-green" type="submit">
          Login
        </button>
      </div>
    </form>
  );
}

export default Login;
