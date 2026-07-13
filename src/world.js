class World {
  constructor() {
    this.events = [];
  }

  addEvent(agentName, description) {
    const event = {
      agentName,
      description,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  recentEvents(n = 5) {
    return this.events.slice(-n);
  }

  // An agent should not "sense" its own action as an external event.
  formatRecentEventsExcluding(agentName, n = 5) {
    const items = this.recentEvents(n)
      .filter((e) => e.agentName !== agentName)
      .map((e) => `- ${e.agentName}: ${e.description}`);
    return items.length ? items.join('\n') : '(nothing happened yet)';
  }
}

module.exports = { World };
