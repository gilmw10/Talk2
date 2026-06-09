//알림음끄기 해도 가끔 안꺼지는거 고치기

import React, { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';

const playChime = (type, isEnabled) => {
  if (!isEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'sent') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'received') {
      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      };
      playTone(523.25, ctx.currentTime, 0.15);
      playTone(783.99, ctx.currentTime + 0.08, 0.3);
    } else if (type === 'system') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (err) {
    console.error(err);
  }
};

export default function ChatRoom({
  socket,
  roomCode,
  users,
  messages,
  typingUsers,
  onLeaveRoom,
  addToast
}) {
  const [inputText, setInputText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [localIsTyping, setLocalIsTyping] = useState(false);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === 'system') {
        playChime('system', soundEnabled);
      } else if (lastMsg.senderId !== socket.id) {
        playChime('received', soundEnabled);
      }
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!localIsTyping) {
      setLocalIsTyping(true);
      socket.emit('typing', { isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setLocalIsTyping(false);
      socket.emit('typing', { isTyping: false });
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('chat-message', { content: inputText, type: 'text' });

    setInputText('');
    setLocalIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', { isTyping: false });

    playChime('sent', soundEnabled);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    addToast('방 코드가 클립보드에 복사되었습니다.', 'success');
  };

  const opponentTyping = Object.entries(typingUsers).some(
    ([id, typing]) => id !== socket.id && typing
  );

  return (
    <section className="screen">
      <div className="chat-container">
        <aside className="chat-sidebar">
          <div className="card sidebar-card">
            <span className="sidebar-section-title">대화방</span>
            <div className="room-code-box">
              <span className="room-code-value">{roomCode}</span>
              <button onClick={handleCopyCode} className="btn btn-secondary btn-sm">
                복사
              </button>
            </div>
            <p className="room-hint">이 코드를 상대방에게 보내면 입장할 수 있습니다.</p>
          </div>

          <div className="card sidebar-card">
            <span className="sidebar-section-title">참여자 ({users.length}/2)</span>
            <ul className="users-list" id="users-list">
              {users.map((user) => {
                const isSelf = user.socketId === socket.id;
                const isUserTyping = typingUsers[user.socketId];
                return (
                  <li key={user.socketId} className={`user-item ${isSelf ? 'self' : ''}`}>
                    <span className={`user-online-dot ${isUserTyping ? 'typing' : ''}`} />
                    <span className="user-name">
                      {user.username}{isSelf ? ' (나)' : ''}
                    </span>
                  </li>
                );
              })}
              {users.length === 1 && (
                <li className="user-item">
                  <span className="user-waiting-dot" />
                  <span className="user-waiting-text">상대방 대기 중...</span>
                </li>
              )}
            </ul>
          </div>

          <div className="card sidebar-card">
            <span className="sidebar-section-title">설정</span>
            <div className="toggle-row">
              <span>알림음</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <button onClick={onLeaveRoom} className="btn btn-danger btn-full">
            대화방 나가기
          </button>
        </aside>

        <div className="chat-board">
          <div className="message-display" id="message-display">
            {messages.map((msg, index) => {
              if (msg.type === 'system') {
                return (
                  <div key={index} className="system-message">
                    <p>{msg.content}</p>
                  </div>
                );
              }
              const isSelf = msg.senderId === socket.id;
              return (
                <div key={index} className={`message ${isSelf ? 'self' : 'opponent'}`}>
                  <span className="message-sender-label">{msg.sender}</span>
                  <div className="message-bubble">
                    <p className="message-text">{msg.content}</p>
                  </div>
                  <div className="message-time">{msg.timestamp}</div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>

          {opponentTyping && (
            <div className="typing-indicator-bar">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <span>상대방이 입력 중...</span>
            </div>
          )}

          <footer className="chat-footer">
            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={users.length < 2 ? '상대방을 기다리는 중...' : '메시지를 입력하세요...'}
                autoComplete="off"
                disabled={users.length < 2}
              />
              <button
                type="submit"
                className="btn btn-primary send-btn"
                disabled={users.length < 2 || !inputText.trim()}
              >
                전송
              </button>
            </form>
          </footer>
        </div>
      </div>
    </section>
  );
}
