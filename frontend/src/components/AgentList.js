import React, { useState, useEffect } from 'react';
import AgentCard from './AgentCard';
import { getAgents } from '../utils/api';
import './AgentList.css';

const AgentList = ({ onSelectAgent }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAgents();
        setAgents(data);
      } catch (err) {
        setError('Failed to load agents.');
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  if (loading) return <div className="agent-list__status">Loading agents...</div>;
  if (error) return <div className="agent-list__status agent-list__status--error">{error}</div>;

  return (
    <div className="agent-list">
      <h2 className="agent-list__title">Our Agents</h2>
      {agents.length === 0 ? (
        <div className="agent-list__status">No agents found.</div>
      ) : (
        <div className="agent-list__grid">
          {agents.map((agent) => (
            <AgentCard key={agent._id} agent={agent} onClick={onSelectAgent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentList;
