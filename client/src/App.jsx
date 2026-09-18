import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    const res = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
    } else {
      alert('Login failed');
    }
  };

  const joinRoom = () => {
    socketRef.current.emit('join room', room);
    setJoined(true);
  };

 const sendMessage = () => {
  if (!input.trim()) return;
  socketRef.current.emit('chat message', { room, msg: input });
  setInput('');
};

  useEffect(() => {
    if (!token) return;

    const socket = io('http://localhost:3001', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error('Connection rejected:', err.message);
    });

    socket.on('chat history', (history) => {
      setMessages(history.map(h => h.msg));
    });

    socket.on('chat message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('presence update', (users) => {
      setOnlineUsers(users);
    });

    socket.on('rate_limit', (msg) => {
      alert(msg);
    });

    return () => socket.disconnect();
  }, [token]);

  if (!token) {
    return (
      <div>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  if (!joined) {
    return (
      <div>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="room name" />
        <button onClick={joinRoom}>Join</button>
      </div>
    );
  }

  return (
    <div>
      <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
      <ul>
        {onlineUsers.map((u, i) => <li key={i}>🟢 {u}</li>)}
      </ul>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;