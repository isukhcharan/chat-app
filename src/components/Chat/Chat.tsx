import React, { FormEvent, useEffect, useState } from "react";
import { UserService } from "../../services/user.service";
import { Message } from "../../interface/message.interface";
import { User } from "../../interface/user.interface";
import { socket } from "../../utils/socket";
import "./Chat.css";
import Waiting from "../Waiting/Waiting";

const EMOJI_REGEX =
  /^(\p{Extended_Pictographic})(\p{Extended_Pictographic})?(\p{Extended_Pictographic})?$/u;

export default function Chat() {
  const userService = new UserService();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketId, setSocketId] = useState<string | undefined>(socket.id);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isWaiting, setWaiting] = useState(false);

  function connectWithUser(socketId: string) {
    userService
      .getUser(socketId)
      .then((user) => {
        setMessages(() => []);
        setUser(user);
        if (user) {
          socket.emit("connect-user", user.id);
        } else {
          setWaiting(true);
        }
      })
      .catch(console.error);
  }

  function onUserConnection(clientSocketId: string) {
    if (!user && socket.id) {
      setUser({
        id: clientSocketId,
        connected_to: socket.id,
        is_connected: true,
      });
      setMessages([]);
      setWaiting(false);
      setIsConnected(true);
    }
  }

  function onMessage(message: Message) {
    setMessages((previousMessages) => [...previousMessages, message]);
    setTimeout(() => {
      const element = document.getElementById(message.id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
        });
      }
    }, 1);
  }

  function onConnect() {
    setIsConnected(true);
    if (socket.id) {
      setSocketId(socket.id);
      connectWithUser(socket.id);
    }
  }

  function onDisconnect() {
    setUser(null);
    setIsConnected(false);
  }

  useEffect(() => {
    if(!socket.id){
      socket.connect();
      setIsConnected(true);
      setSocketId(socket.id);
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("on-user-connect", onUserConnection);
    socket.on("on-message", onMessage);
    socket.on("user-disconnected", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("on-user-connect", onUserConnection);
      socket.off("on-message", onMessage);
      socket.off("user-disconnected", onDisconnect);
    };
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (user && user.id && socket.id) {
      let form = event.target as HTMLFormElement;
      let inputElement = form[0] as HTMLInputElement;
      let value = inputElement.value;
      if (!value.trim()) {
        return;
      }
      
      let message: Message = {
        id: Math.random().toString(),
        message: value.trim(),
        from: socket.id,
        to: user.id,
        timestamp: Date.now(),
      };

      setMessages((previousMessages) => [...previousMessages, message]);
      inputElement.value = "";
      setTimeout(() => {
        const element = document.getElementById(message.id);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
          });
        }
      });
      socket.emit("message", message);
    }
  };

  const disconnectUser = () => {
    const response = window.confirm("Are you sure you want to disconnect?");
    if (response) {
      setIsConnected(false);
      socket.disconnect();
    }
  };

  const startNewChat = () => {
    socket.connect();
    setIsConnected(true);
    if (socket.id) {
      setSocketId(socket.id);
      connectWithUser(socket.id);
    }
  };

  return (
    <div className="chat-container">
      {!!user && (
        <div className="connection text-center">
          Connected to user {user.id}
        </div>
      )}
      <form autoComplete="off" onSubmit={onSubmit}>
        <div className="message-container">
          {isWaiting ? (
            <Waiting />
          ) : (
            <>
              <div className="message-box-container">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    id={m.id}
                    className={`message ${
                      m.from === socketId ? "right" : "left"
                    }`}
                  >
                    <div
                      className={EMOJI_REGEX.test(m.message) ? "emoji" : "text"}
                    >
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              {!user && <h5 className="text-center">User Disconnected</h5>}
            </>
          )}
        </div>

        <div className="text-box-container">
          <input
            placeholder="Type here"
            name="message"
            type="text"
            id="message"
            disabled={isWaiting}
          />

          <button disabled={isWaiting} className="submitButton" type="submit">
            <span className="material-symbols-outlined">send</span>
          </button>

          {isConnected ? (
            <button
              onClick={disconnectUser}
              className="disconnectButton"
              type="button"
              disabled={isWaiting}
            >
              <span className="material-symbols-outlined">person_cancel</span>
            </button>
          ) : (
            <button
              onClick={startNewChat}
              className="startNewChat"
              type="button"
              disabled={isWaiting}
            >
              <span className="material-symbols-outlined">replay</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
