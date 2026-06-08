import React, { useState } from 'react';
import './Lobby.css';

export default function Lobby({
  username,
  setUsername,
  roomCodeInput,
  setRoomCodeInput,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom
}) {
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateUsername = () => {
    if (!username.trim()) {
      setError('대화에 사용할 닉네임을 먼저 입력해주세요.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNicknameSubmit = (e) => {
    if (e) e.preventDefault();
    if (validateUsername()) {
      setIsSubmitted(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNicknameSubmit(e);
    }
  };

  const handleQuickMatch = () => {
    if (validateUsername()) onQuickMatch();
  };

  const handleCreateRoom = () => {
    if (validateUsername()) onCreateRoom();
  };

  const handleJoinRoom = () => {
    if (validateUsername()) {
      if (!roomCodeInput.trim()) {
        setError('입장할 대화방 코드를 입력해주세요.');
        return;
      }
      onJoinRoom();
    }
  };

  return (
    <div className="lobby-wrapper">
      <header className="lobby-brand-header">
        <img src="/logo.png" alt="Talk2 로고" className="lobby-brand-logo-img" />
      </header>

      <section className="lobby-screen">
        <div className="lobby-left">
          <h2 className="lobby-title-sub">단둘이서</h2>
          <h2 className="lobby-title-main">빠르고, 간편하게</h2>
          <p className="lobby-title-desc">
            <span>Talk2</span>에서 소통하세요
          </p>
        </div>

        <div className="lobby-right">
          {!isSubmitted ? (
            <div className="nickname-container">
              <div className="card">
                <h3 className="nickname-card-title">닉네임 입력</h3>
                <form onSubmit={handleNicknameSubmit}>
                  <div className="nickname-input-wrapper">
                    <input
                      type="text"
                      id="username-input"
                      placeholder="사용할 닉네임을 입력하세요..."
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      maxLength={15}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className={`nickname-submit-btn ${username.trim() ? 'visible' : ''}`}
                      aria-label="닉네임 확인"
                    >
                      <svg viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </form>
                {error && (
                  <div className="error-notice" style={{ marginTop: '12px' }}>
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lobby-cards-container">
              {/* 빠른 매칭 */}
              <div className="action-card-modern">
                <div className="action-card-header">
                  <div className="action-card-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <h3>빠른 매칭</h3>
                </div>
                <p>대기 중인 사용자와 즉시 매칭되어 1대1 대화를 시작합니다.</p>
                <div className="action-card-footer">
                  <button
                    id="btn-quick-match"
                    className="btn btn-primary btn-full"
                    onClick={handleQuickMatch}
                  >
                    지금 시작하기
                  </button>
                </div>
              </div>

              {/* 개인 대화방 만들기 */}
              <div className="action-card-modern">
                <div className="action-card-header">
                  <div className="action-card-icon-box orange">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                  </div>
                  <h3>개인 대화방 만들기</h3>
                </div>
                <p>새로운 대화방 코드를 생성하고 상대방을 초대해 대화합니다.</p>
                <div className="action-card-footer">
                  <button
                    id="btn-create-room"
                    className="btn btn-secondary btn-full"
                    onClick={handleCreateRoom}
                  >
                    방 만들기
                  </button>
                </div>
              </div>

              {/* 대화방 입장 */}
              <div className="action-card-modern">
                <div className="action-card-header">
                  <div className="action-card-icon-box purple">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <h3>대화방 입장</h3>
                </div>
                <p>전달받은 대화방 코드를 입력하고 입장합니다.</p>
                <div className="action-card-footer flex-row">
                  <input
                    type="text"
                    id="room-code-input"
                    placeholder="방 코드 입력..."
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    maxLength={12}
                    autoComplete="off"
                  />
                  <button
                    id="btn-join-room"
                    className="btn btn-secondary"
                    onClick={handleJoinRoom}
                  >
                    입장
                  </button>
                </div>
                {error && error.includes('입장할 대화방') && (
                  <div className="error-notice">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
