export const DIMS = [
  {
    id: 'lead_capture',
    name: 'Lead Capture Completeness',
    note: 'Did the bot collect every required field for this client?',
    key: 'Configurable per client profile',
  },
  {
    id: 'lead_qualification',
    name: 'Lead Qualification Quality',
    note: 'Did the bot gather useful preference data (city, budget, dates, room type)?',
    key: 'Even if not all fields are required',
  },
  {
    id: 'clarification',
    name: 'Clarification & Edge Cases',
    note: 'Were absurd inputs (£2/week, 500-day stays, joke answers) handled gracefully?',
    key: 'Tone + accuracy under pressure',
  },
  {
    id: 'consistency',
    name: 'Consistency / Memory',
    note: 'Did the bot remember earlier answers within the same session?',
    key: '71-week example: fail',
  },
  {
    id: 'persona',
    name: 'Persona & Transparency',
    note: 'Consistent bot name? Honest when asked "are you a bot"?',
    key: 'Name slip = automatic fail',
  },
  {
    id: 'escalation',
    name: 'Escalation & Handoff',
    note: '"Call me now" handled correctly? Viewing scheduling accurate?',
    key: 'Timezone check too',
  },
  {
    id: 'out_of_scope',
    name: 'Out-of-Scope Handling',
    note: 'Currency, timezone, payments — deflected or handled appropriately?',
    key: '₹400 example: pass',
  },
  {
    id: 'ux_tone',
    name: 'Overall UX & Tone',
    note: 'Friendly, natural, recovers from frustration? On-brand voice?',
    key: 'Holistic judgement',
  },
];

export const LEAD_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'city', 'university', 'budget', 'move_in_date', 'room_type', 'lease_length',
];

export const ESCALATION_CHANNELS = ['call', 'email', 'contact_form', 'live_chat'];

export const OUT_OF_SCOPE_POLICIES = [
  { value: 'deflect_to_contact', label: 'Deflect to contact' },
  { value: 'say_dont_know', label: "Say I don't know" },
  { value: 'handle_directly', label: 'Handle directly' },
];

export const SAMPLE_TRANSCRIPT = `Bot: Hi! I'm Aria, your accommodation assistant at Nexus Living. How can I help?
User: I want to book a room
Bot: Great! Could you share your full name?
User: Jamie
Bot: Thanks Jamie! And your surname?
User: Okafor
Bot: Perfect. What's your email address?
User: jamie@yopmail.com
Bot: And a phone number?
User: 07512345678
Bot: Got it. Which city are you hoping to study in?
User: London
Bot: We don't have properties in London currently. We're in Manchester, Sheffield, Birmingham, and Nottingham. Any of those work?
User: Manchester then
Bot: Manchester it is! Which academic year?
User: 2026/27
Bot: And your university?
User: Manchester Met
Bot: Great match. What's your weekly budget?
User: 200 quid
Bot: Our rooms in Manchester start from £185/week. £200 gives us a few good options — shall I show you those?
User: Yes please
Bot: Here are three rooms that fit your budget and dates…`;
