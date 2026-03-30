import React from 'react';
import './AgentCard.css';

const AgentCard = ({ agent, onClick }) => {
  const { name, agency, bio, photo, phone, email, listings } = agent;
  const imgSrc = photo || 'https://via.placeholder.com/100x100?text=Agent';

  return (
    <div className="agent-card" onClick={() => onClick && onClick(agent)}>
      <img src={imgSrc} alt={name} className="agent-card__photo" />
      <div className="agent-card__body">
        <h3 className="agent-card__name">{name}</h3>
        {agency && <p className="agent-card__agency">{agency}</p>}
        {bio && typeof bio === 'string' && <p className="agent-card__bio">{bio.substring(0, 100)}{bio.length > 100 ? '...' : ''}</p>}
        <div className="agent-card__contact">
          <a href={`tel:${phone}`}>{phone}</a>
          <a href={`mailto:${email}`}>{email}</a>
        </div>
        <p className="agent-card__listings">
          {listings ? listings.length : 0} listing{listings && listings.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default AgentCard;
