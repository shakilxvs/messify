'use client';

import Image from 'next/image';

const AVATAR_COLORS = [
  '#E60023', '#0076D3', '#00A84F', '#FF6B35', '#9B59B6',
  '#1ABC9C', '#F39C12', '#E74C3C', '#3498DB', '#2ECC71',
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColorFromName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Avatar({ name = '', photoURL = null, avatarColor = null, size = 40, className = '' }) {
  const color = avatarColor || getColorFromName(name);
  const initials = getInitials(name);

  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: size * 0.36,
    color: 'white',
    background: photoURL ? 'transparent' : color,
    flexShrink: 0,
  };

  if (photoURL) {
    return (
      <div style={style} className={className}>
        <img src={photoURL} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div style={style} className={className}>
      {initials}
    </div>
  );
}
