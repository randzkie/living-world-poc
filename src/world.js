class World {
  constructor() {
    this.events = []; // { agentName, location, description, timestamp }
    this.agentLocations = new Map(); // name -> current location name
  }

  setAgentLocation(name, location) {
    this.agentLocations.set(name, location);
  }

  getAgentsAt(location, excludingName) {
    const names = [];
    for (const [name, loc] of this.agentLocations) {
      if (loc === location && name !== excludingName) names.push(name);
    }
    return names;
  }

  addEvent(agentName, location, description) {
    const event = { agentName, location, description, timestamp: new Date().toISOString() };
    this.events.push(event);
    return event;
  }

  recentEventsAt(location, n = 8) {
    return this.events.filter((e) => e.location === location).slice(-n);
  }

  // This is the actual "senses" boundary now: only events that happened at
  // this specific location are visible, not the whole town.
  formatRecentEventsAt(location, excludingAgentName, n = 8) {
    const items = this.recentEventsAt(location, n)
      .filter((e) => e.agentName !== excludingAgentName)
      .map((e) => `- ${e.agentName}: ${e.description}`);
    return items.length ? items.join('\n') : '(nothing happened here recently)';
  }
}

module.exports = { World };