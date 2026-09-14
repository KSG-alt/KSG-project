/* ── Activity guides ──────────────────────────────────────────────────────
   The centre's own written procedure for each activity, the thing a group
   leader actually needs at 08:55 on the morning they are running archery for
   the first time: what to set up, what to say, what stops the session, and
   who to call.

   These are a centre's operating notes, not regulation. They name the centre
   as their owner and carry a review date, because a procedure nobody owns and
   nobody reviews is the one that gets ignored. The qualification each session
   requires is read from the activity record, not repeated here, so there is
   one source for it.
   ──────────────────────────────────────────────────────────────────────── */

export interface Emergency {
  firstAid: string;
  callFirst: string;
  assembly: string;
}

export interface Guide {
  activityId: string;
  /* One paragraph a leader can read while walking to the site. */
  summary: string;
  duration: string;
  groupSize: string;
  kit: string[];
  before: string[];
  during: string[];
  after: string[];
  hazards: { risk: string; control: string }[];
  abort: string[];
  safeguarding: string[];
  emergency: Emergency;
  owner: string;
  reviewed: string;
  offSite: boolean;
}

export const GUIDES: Guide[] = [
  {
    activityId: 'a-archery',
    summary:
      'Target archery on booked pitch space at The Hub in Regent\u2019s Park, shot away from the footpaths. One qualified instructor runs the line and calls every whistle; the other staff work the waiting group, not the shooting line. Nobody collects arrows until the instructor calls it. This is a public park — the overshoot area has to be roped and watched the whole time.',
    duration: '90 minutes, including 15 to set up and 15 to clear',
    groupSize: 'Up to 24, shooting in waves of 8',
    kit: [
      'Bosses, stands and target faces — six',
      'Bows sized to the band, with spare strings',
      'Arrows, counted out and counted back in',
      'Arm guards and finger tabs for every shooter',
      'Whistle for the instructor, and one spare',
      'Rope and cones for the waiting line and the overshoot area',
      'First aid kit and the group register',
    ],
    before: [
      'Walk the pitch before the group arrives. The overshoot area behind the targets has to be clear of the public and stay clear — in a park that means somebody watching it, not just checking it once.',
      'Rope the waiting line at least five metres behind the shooting line, and cone the ends. Rope the overshoot area too.',
      'Set the bosses square to the shooting line and check every stand is stable.',
      'Count the arrows out loud with a second staff member and write the number down.',
      'Take the register at the field, not at the accommodation.',
    ],
    during: [
      'Brief the whole group before anyone touches a bow: the two whistles, the line, and never point a bow anywhere but down the range.',
      'One whistle to shoot. Two whistles to stop, lower everything, and step back.',
      'Shoot in waves of eight. The rest of the group stays behind the rope with the other staff.',
      'Nobody walks forward of the shooting line until the instructor has called it and can see the whole line.',
      'Stop the session for any bow pointed off the range. Once, clearly, and explain why.',
    ],
    after: [
      'Two whistles, collect every arrow, and count them back in against the number written down.',
      'Any arrow unaccounted for — sweep the pitch before the group leaves. Nothing is left in the grass of a public park.',
      'Strings off, bows and arrows back in the store, bosses under cover.',
      'Register again before walking back.',
      'Write up anything that went wrong in Incidents, same day.',
    ],
    hazards: [
      { risk: 'Someone forward of the line while shooting', control: 'Two whistles stops everything. Only the instructor calls people forward.' },
      { risk: 'Arrow over the target into a public footpath', control: 'Overshoot area roped and watched by a named staff member for the whole session.' },
      { risk: 'Finger and forearm injury', control: 'Tabs and arm guards on every shooter, checked at the line.' },
      { risk: 'A bow too heavy for the shooter', control: 'Bows sized to the band, swapped if the shooter cannot hold the draw steady.' },
    ],
    abort: [
      'Wind strong enough to move a target face on its stand',
      'A member of the public in the overshoot area who will not move',
      'The qualified instructor leaves the line for any reason',
      'Lightning within sight or hearing',
    ],
    safeguarding: [
      'Register at the start and at the end, at the activity site.',
      'A student who wants to stop shooting stops. They stay with the group, not alone.',
      'No photographs unless the consent list says so — check it before the session, not after.',
    ],
    emergency: {
      firstAid: 'Kit at the shooting line. The Hub building has a first aid point and staff on site.',
      callFirst: 'Welfare officer on 07700 900613. Ambulance direct for anything to the eye or a deep puncture.',
      assembly: 'The Hub building entrance.',
    },
    owner: 'Tomas Halvorsen, activity manager',
    reviewed: '2027-05-18',
    offSite: false,
  },
  {
    activityId: 'a-kayak',
    summary:
      'Flat-water paddling on the Regent\u2019s Canal from the wharf at The Pirate Castle. Their instructors run the water; our staff run the group. Buoyancy aids are fitted on land and checked by a second person before anyone gets in a boat. It is a canal, not open water — the risks are the towpath, the locks and the cold, not the sea.',
    duration: '90 minutes on the water, plus 20 for kit and changing',
    groupSize: 'Up to 20, in two pods of 10 with one staff member each',
    kit: [
      'Buoyancy aid fitted to each student, checked by a second staff member',
      'Helmets where the launch is over rock',
      'Kayaks and paddles sized to the band',
      'Throw line with each staff member on the water',
      'Their safety cover on the water, per the booking',
      'Waterproof first aid kit and a charged phone in a dry bag',
      'Register on waterproof paper',
    ],
    before: [
      'Check with their duty instructor that the canal is open — a lock closure or a boat movement can stop the session at no notice.',
      'Count the group at the centre, at the wharf, and again on the water.',
      'Fit every buoyancy aid on land. A second staff member checks each one by lifting at the shoulders.',
      'Confirm who can swim and who cannot from the medical forms — not by asking the group.',
      'Agree and show the boundary: nobody paddles past the bridge in either direction, and nobody goes near the lock.',
    ],
    during: [
      'Staff stay on the water with their pod. Never on the pontoon while students are afloat.',
      'Count the group every fifteen minutes, out loud, and say the number to the other staff member.',
      'Capsize drill first, in shallow water, before anything else.',
      'Anyone cold, frightened or not enjoying it comes in. No persuading.',
      'One whistle blast means come to the instructor. Teach it before launching.',
    ],
    after: [
      'Count off the water, count on the pontoon, count in the changing room.',
      'Kit rinsed and handed back, buoyancy aids hung, nothing left on the towpath.',
      'Check for anybody shivering before the walk back, and tell the welfare officer if so.',
      'Report any near miss the same day, even if nothing happened.',
    ],
    hazards: [
      { risk: 'Capsize and cold shock', control: 'Drill in shallow water first. Lifeguard on the water throughout.' },
      { risk: 'A student drifting past the boundary', control: 'Visible marker, boundary briefed before launch, count every fifteen minutes.' },
      { risk: 'Non-swimmer in the group', control: 'Read from the medical form beforehand and pair them with a staff member.' },
      { risk: 'Canal boat traffic and the lock', control: 'Boundary set between two bridges, away from the lock, and briefed before launch.' },
    ],
    abort: [
      'Their instructor calls it off, for any reason — it is their water',
      'A lock movement or a boat convoy through the session boundary',
      'Anybody in the water who did not mean to be, until everyone is checked',
      'Any student in the water who cannot self-rescue after the drill',
    ],
    safeguarding: [
      'Count at every transition, and say the number aloud to another adult.',
      'Changing rooms: staff supervise the door, never the inside.',
      'No phones or cameras in the changing area at all, staff included.',
    ],
    emergency: {
      firstAid: 'Dry bag with the lead instructor. The Pirate Castle has first aid on site.',
      callFirst: '999 for anyone missing on the water, then their duty manager, then the welfare officer. In that order.',
      assembly: 'Top of the ramp on Oval Road, off the towpath.',
    },
    owner: 'Tomas Halvorsen, activity manager',
    reviewed: '2027-06-02',
    offSite: false,
  },
  {
    activityId: 'a-english',
    summary:
      'Ninety minutes of classroom English in Block C, taught by a TEFL-qualified teacher against the group’s level. The point of the lesson in an activity centre is that it connects to the afternoon — the language they will need on the canal, at the museum, at dinner.',
    duration: '90 minutes, with a break at 45',
    groupSize: 'Up to 30, working in pairs or fours',
    kit: [
      'Lesson plan against the group’s level',
      'Board pens that work — check before, not during',
      'Printed handouts for the whole group plus five',
      'Register',
      'Vocabulary for this afternoon’s activity',
    ],
    before: [
      'Check the room is set for pairs, not rows.',
      'Read the group list for anyone who arrived this week — they will be behind and will not say so.',
      'Know what the group is doing this afternoon, and teach the words for it.',
    ],
    during: [
      'Take the register in the first five minutes and mark anyone absent to the group leader immediately.',
      'Keep the teacher talking under a third of the lesson.',
      'Break at 45 minutes. Students stay on the corridor, not the grounds.',
      'A student who is struggling gets seen at the break, quietly, not in front of the group.',
    ],
    after: [
      'Register again at the end.',
      'Note anyone who was upset, withdrawn or absent, and tell the welfare officer the same morning.',
      'Leave the room as you found it — another group is in at 11:00.',
    ],
    hazards: [
      { risk: 'A student who cannot follow at all and stops speaking', control: 'Seen at the break, moved to the right level within two days.' },
      { risk: 'Absent from the lesson and unaccounted for', control: 'Register in the first five minutes, missing name raised straight away.' },
    ],
    abort: [
      'Fire alarm — evacuate by the Block C route, register at the assembly point',
      'A student disclosure mid-lesson — stop, hand the class to the second staff member, follow the disclosure procedure',
    ],
    safeguarding: [
      'Door open or the window blind up when a teacher is one-to-one with a student.',
      'A disclosure is recorded in the words the student used, immediately, and taken to the safeguarding lead — no promises of secrecy.',
      'Homework is never a reason to keep a student back alone.',
    ],
    emergency: {
      firstAid: 'Block C reception, first door on the left.',
      callFirst: 'Welfare officer on 07700 900613.',
      assembly: 'Block C car park, by the flagpole.',
    },
    owner: 'Kebba Sarr, safeguarding lead',
    reviewed: '2027-04-30',
    offSite: false,
  },
  {
    activityId: 'a-drama',
    summary:
      'Workshop in the hall run by a visiting Playhouse Education practitioner. Centre staff stay in the room for the whole session — the visitor runs the drama, the centre runs the group.',
    duration: '90 minutes',
    groupSize: 'Up to 28',
    kit: [
      'Hall cleared, chairs stacked at the side',
      'Sound system tested before the group comes in',
      'Register',
      'Water for the group — it is more physical than it sounds',
    ],
    before: [
      'Check the visiting practitioner’s DBS has been seen and recorded. If it has not, they do not work unsupervised — and the session does not start until a centre staff member is in the room.',
      'Clear the floor. Every trip hazard, including bags.',
      'Tell the practitioner about any student who should not be put on the spot.',
    ],
    during: [
      'Two centre staff in the room, the whole session. The visitor is never alone with the group.',
      'Nobody is made to perform. Watching is taking part.',
      'Watch for a student using the workshop to say something real. Drama does that.',
    ],
    after: [
      'Register, then chairs back.',
      'Debrief the practitioner in under five minutes: anything they noticed about a student comes to the centre, not away with them.',
      'Anything said in the room that concerns you goes to the safeguarding lead today.',
    ],
    hazards: [
      { risk: 'Trips during movement work', control: 'Floor cleared before the group enters, bags outside the hall.' },
      { risk: 'A visitor alone with students', control: 'Two centre staff in the room for the whole session.' },
      { risk: 'A student distressed by the material', control: 'Nobody is made to perform; welfare officer told the same day.' },
    ],
    abort: [
      'The visiting practitioner arrives without a recorded DBS and no centre staff are free to stay in the room',
      'Hall floor wet or the sound system unsafe',
    ],
    safeguarding: [
      'Visiting staff are never alone with a group. Ever, for any reason, including packing up.',
      'No filming of the workshop, even for the supplier’s own use.',
      'Drama surfaces things. Take anything you hear seriously and write it down the same day.',
    ],
    emergency: {
      firstAid: 'Hall store cupboard, and the sports centre lobby defibrillator.',
      callFirst: 'Welfare officer on 07700 900613.',
      assembly: 'Hall fire door, then the front lawn.',
    },
    owner: 'Anouk Jansen, welfare officer',
    reviewed: '2027-05-11',
    offSite: false,
  },
  {
    activityId: 'a-museum',
    summary:
      'Off-site excursion to the Natural History Museum by coach. The whole session is counting: on the coach, off the coach, into the museum, out of the museum, on the coach again. School groups use the Exhibition Road entrance and leave bags at School Reception on the lower ground floor of the Green Zone. Off-site ratio is tighter than on site, and travel consent is checked by name before anyone boards.',
    duration: 'Half a day including travel',
    groupSize: 'Up to 45, in sub-groups of no more than 10 with a named staff member',
    kit: [
      'Travel consent checked by name, printed, carried',
      'Emergency contact list for every student on the trip',
      'Two charged phones per sub-group, numbers exchanged before boarding',
      'First aid kit on the coach and one with each sub-group',
      'Wristbands or lanyards with the centre number — never the student’s name',
      'Meeting point and time written down and given to every student',
    ],
    before: [
      'Check travel consent against the list, name by name. A student without consent does not go, however short the notice.',
      'Check the off-site ratio for the band before the coach is loaded. It is tighter than on site.',
      'Split into sub-groups and name the staff member for each. Students learn their staff member’s name before boarding.',
      'Agree the meeting point inside the museum and the time, and say it twice. Hintze Hall by the whale is the one everybody can find.',
      'Count on to the coach. Write the number down.',
    ],
    during: [
      'Count off the coach, count into the museum, and again at every meeting time.',
      'Sub-groups stay together. No student moves between sub-groups without both staff knowing.',
      'Set a meeting time every 45 minutes, and be at the meeting point early yourself.',
      'Toilets in pairs, with a time to be back.',
    ],
    after: [
      'Count on to the coach and match the number written down before leaving.',
      'Do not leave the car park until the count matches. Not once.',
      'Count off at the centre and register.',
      'Anything that went wrong goes in Incidents today, including near misses.',
    ],
    hazards: [
      { risk: 'A student separated in a public building', control: 'Sub-groups of 10, meeting point every 45 minutes, centre number on the wristband.' },
      { risk: 'Travelling without consent on file', control: 'Checked by name against the printed list before boarding.' },
      { risk: 'Road traffic on the way in', control: 'Staff at the front and back of the crossing, group waits as one.' },
      { risk: 'Coach departs a student behind', control: 'Count on, count matched against the written number, no departure until it matches.' },
    ],
    abort: [
      'The count does not match at any point — nothing moves until it does',
      'Off-site ratio not met because a staff member is unavailable',
      'Coach arrives without the operator or seatbelts unusable',
      'Severe weather warning for the city',
    ],
    safeguarding: [
      'Wristbands carry the centre number, never the student’s name. A stranger should not be able to read a child’s name off them.',
      'Students are told, before they leave: if you are lost, stay where you are and speak to museum staff.',
      'No student goes anywhere alone, including the toilet.',
      'Photographs only if the consent list allows, and never on a personal phone.',
    ],
    emergency: {
      firstAid: 'Kit with each sub-group. Ask any museum staff member for first aid.',
      callFirst: 'Centre director first for a missing student, then 999. The coach does not leave.',
      assembly: 'Exhibition Road entrance, then the Cromwell Road coach bay.',
    },
    owner: 'Kebba Sarr, safeguarding lead',
    reviewed: '2027-06-14',
    offSite: true,
  },
  {
    activityId: 'a-football',
    summary:
      'Coached football on a booked pitch at The Hub in Regent\u2019s Park. Mixed ability and mixed language, so the session is built around playing, not drilling. A Level 2 coach runs it; other staff make up the ratio and keep an eye on who is being left out.',
    duration: '90 minutes',
    groupSize: 'Up to 24, in small-sided games',
    kit: [
      'Bibs in two colours, counted',
      'Balls, pumped before the session',
      'Portable goals, pegged down',
      'Water for the group, and more in hot weather',
      'First aid kit pitchside',
      'Register',
    ],
    before: [
      'Walk the pitch. Anything on the surface, any loose peg, any dog mess — it is a public park.',
      'Peg the goals down. A portable goal that tips is the worst injury on a school field.',
      'Check the medical forms for asthma, and know where the inhalers are.',
      'In hot weather, set the water breaks before you start, not when someone asks.',
    ],
    during: [
      'Small-sided games. More touches, fewer students standing still and cold.',
      'Mix the teams by ability, not by language — it is the fastest way to get them talking.',
      'Water break every 20 minutes in hot weather, and in the shade.',
      'Watch who is never passed to. That is a welfare matter, not a football one.',
    ],
    after: [
      'Bibs counted in, goals unpegged and stored, pitch walked again.',
      'Register.',
      'Any knock that needed ice goes in Incidents, even if they carried on.',
    ],
    hazards: [
      { risk: 'Portable goal tipping', control: 'Pegged before the session and checked at half time.' },
      { risk: 'Heat, in a group not used to the weather', control: 'Water breaks in the shade every 20 minutes, set in advance.' },
      { risk: 'Asthma attack', control: 'Inhalers read from the medical forms and kept pitchside.' },
      { risk: 'A student excluded by the group', control: 'Teams mixed by the coach, not chosen by students.' },
    ],
    abort: [
      'Lightning within sight or hearing — off the pitch and into The Hub immediately, no exceptions',
      'Surface unsafe after rain — the Royal Parks close pitches, and that call is theirs',
      'A goal that cannot be pegged',
    ],
    safeguarding: [
      'Teams are picked by the coach. Never by students choosing each other.',
      'Register at the start and the end, at the pitch.',
      'No photographs unless the consent list says so.',
    ],
    emergency: {
      firstAid: 'Pitchside kit. The Hub building has a first aid point and staff on site.',
      callFirst: 'Welfare officer on 07700 900613. 999 for a head injury with any loss of consciousness.',
      assembly: 'The Hub building entrance.',
    },
    owner: 'Tomas Halvorsen, activity manager',
    reviewed: '2027-05-27',
    offSite: false,
  },
  {
    activityId: 'a-climbing',
    summary:
      'Indoor climbing at VauxWall in the railway arches under Vauxhall station, run by their instructors on their wall and their systems. Centre staff do not belay and do not supervise the wall — they hold the group, the register and the welfare.',
    duration: '90 minutes including harness fitting',
    groupSize: 'Up to 16, which is the wall’s own limit',
    kit: [
      'Harnesses and helmets — fitted and checked by Vertical Ltd staff, not by us',
      'Closed footwear for every student, checked before leaving the centre',
      'Long hair tied back, no loose jewellery',
      'Register',
      'Medical notes for anyone with a shoulder, back or joint condition',
    ],
    before: [
      'Confirm instructor numbers against the booking. If they are short, the session does not run at full size.',
      'Check footwear at the centre, not at the wall. A student in sandals cannot climb and will not want to be the one who found out on arrival.',
      'Hand the medical notes that matter to the lead instructor, verbally, before the session.',
      'Register at the centre and again at the arches.',
    ],
    during: [
      'Every harness is fitted and checked by their staff. Centre staff never check a harness — if it is our check, it is our liability and our mistake.',
      'Centre staff stay with the waiting group, watching the floor, not the wall.',
      'Nobody is made to climb. Standing at the bottom is taking part.',
      'Count the group every time the wall rotates.',
    ],
    after: [
      'Kit returned to their staff and counted by them.',
      'Register at the arches and again back at the centre.',
      'Any fall, slip or knock goes in Incidents, however small, and Vertical Ltd are told the same day.',
    ],
    hazards: [
      { risk: 'Incorrectly fitted harness', control: 'Fitted and checked by Vertical Ltd staff only. Centre staff never check.' },
      { risk: 'A student frozen at height', control: 'Their instructor talks them down. No shouting from the floor.' },
      { risk: 'Existing joint or shoulder injury', control: 'Medical notes handed to the lead instructor before the session.' },
      { risk: 'Loose hair or jewellery in a device', control: 'Checked at the centre before leaving.' },
    ],
    abort: [
      'Vertical Ltd short of instructors for the group size',
      'Wall closed or a hold failure reported',
      'Any equipment failure, until their staff say otherwise',
    ],
    safeguarding: [
      'Supplier staff are never alone with a student, including in the kit room.',
      'A student who does not want to climb is not persuaded, and is not left standing alone.',
      'No photographs unless the consent list says so.',
    ],
    emergency: {
      firstAid: 'Their reception desk, inside the arch.',
      callFirst: 'Vertical Ltd duty manager first for anything on the wall — it is their system. Welfare officer straight after.',
      assembly: 'South Lambeth Road, clear of the arches.',
    },
    owner: 'Tomas Halvorsen, activity manager',
    reviewed: '2027-06-09',
    offSite: false,
  },
];

export const guideFor = (activityId: string) =>
  GUIDES.find((g) => g.activityId === activityId) ?? null;
