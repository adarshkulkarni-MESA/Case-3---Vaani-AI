/**
 * Seed script — populates the database with the 20 real September 2026 enquiry transcripts
 * from the Aangan Studio seed data, processed through the qualification engine.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { db } from "../lib/db";
import { users, customers, calls, transcripts, meetings } from "../lib/db/schema";
import { qualifyLead, generateHandoffNote } from "../lib/ai/qualification";
import bcrypt from "bcryptjs";

const SEED_CALLS = [
  {
    id: "T01",
    callerName: "Priya",
    callerPhone: "+919900000001",
    callTimestamp: new Date("2026-09-02T10:23:00+05:30"),
    durationSeconds: 252,
    projectLocation: "Kothrud, Dahanukar Colony",
    propertyType: "3BHK",
    squareFeet: 1400,
    projectScope: "Full home redesign — kitchen, living room, both bedrooms",
    timeline: "By March — no rush",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Front Desk: Good morning, Aangan Studio.
Caller: Hi, I'm Priya. I got your number from a friend — Shruti Joshi. She had her flat done by you in Aundh.
Front Desk: Of course — thank you for calling. What are you looking to do?
Caller: We have a 3BHK in Kothrud — Dahanukar Colony. We bought it two years ago and it still looks like the builder flat. We want to redo the whole thing — kitchen, living room, both bedrooms.
Front Desk: That sounds like a complete redesign. How big is the apartment?
Caller: About 1,400 sq ft carpet.
Front Desk: And your timeline?
Caller: We'd like to be done by March. We're in no rush.
Front Desk: Perfect. Are you the owner?
Caller: Yes — myself and my husband. He knows we're calling and is happy to go ahead.
Front Desk: Lovely. Can I take your number and schedule a consultation?
Caller: Sure.`,
    aiSummary: "Referral client (via Shruti Joshi) looking to fully redesign a 3BHK in Kothrud. 1,400 sq ft. Complete home — kitchen, living room, both bedrooms. Timeline: March. Both owners aligned and ready to proceed.",
  },
  {
    id: "T02",
    callerName: null,
    callerPhone: "+919900000002",
    callTimestamp: new Date("2026-09-03T14:41:00+05:30"),
    durationSeconds: 308,
    projectLocation: "Wakad",
    propertyType: "2BHK",
    squareFeet: 950,
    projectScope: "Full redesign — modular kitchen, wardrobes, living room, both bedrooms",
    timeline: "October start, move in November",
    isDecisionMaker: null,
    askedAboutPrice: true,
    transcript: `Caller: Hi. I was looking at your work on Instagram. I have a 2BHK in Wakad — can you tell me roughly how much something like that would cost?
Front Desk: Our pricing depends on the materials and the scope — the best way to get a clear picture is a consultation with one of our designers, who can walk you through everything. What are you planning to do?
Caller: Full redesign — modular kitchen, wardrobes, living room, both bedrooms. About 950 sq ft.
Front Desk: Good scope. What's your timeline?
Caller: We move in November — so maybe starting design from October?
Front Desk: That works well. Shall I set up a consultation?
Caller: Yes, but can you give me a rough ballpark first? Even a range?
Front Desk: I genuinely can't — it varies quite a bit based on materials. Giving you a number without seeing the site would be misleading. The designer will go through all of that with you — the consultation is free and there's no obligation.
Caller: Okay, fair enough. Let's book it.`,
    aiSummary: "Instagram enquiry. 2BHK in Wakad, 950 sq ft. Full scope including kitchen, wardrobes, living, both bedrooms. Moves in November — October design start. Asked about pricing, standard response given. Agreed to book consultation.",
  },
  {
    id: "T03",
    callerName: "Suresh Patil",
    callerPhone: "+919900000003",
    callTimestamp: new Date("2026-09-03T16:15:00+05:30"),
    durationSeconds: 160,
    projectLocation: "Nashik",
    propertyType: "Home office",
    squareFeet: null,
    projectScope: "Home office and study redesign",
    timeline: null,
    isDecisionMaker: true,
    askedAboutPrice: false,
    rejectionReason: "Location is outside our service area (Pune/PCMC).",
    transcript: `Caller: Hello, I saw your work on LinkedIn. My name is Suresh Patil. I'm in Nashik — would you be able to take on a project here?
Front Desk: Thank you for calling. We only work in Pune and PCMC at the moment — we don't have the vendor network to take on projects outside Pune.
Caller: Not even for a smaller project?
Front Desk: Even for a smaller project, our execution depends on our contractors being on-site. I'm sorry we can't help.
Caller: Alright, understood. Thanks.`,
    aiSummary: "Caller from Nashik enquiring about a home office redesign. Outside service area — declined politely.",
  },
  {
    id: "T04",
    callerName: null,
    callerPhone: "+919900000004",
    callTimestamp: new Date("2026-09-04T11:07:00+05:30"),
    durationSeconds: 202,
    projectLocation: null,
    propertyType: null,
    squareFeet: null,
    projectScope: "Advice only — colour ideas, furniture arrangement",
    timeline: null,
    isDecisionMaker: null,
    askedAboutPrice: false,
    rejectionReason: "Project scope doesn't match our services — we require design + execution.",
    transcript: `Caller: Hi — can someone come and give us some ideas for our living room? We're not planning to do the full thing right now. Just want suggestions on colours, furniture arrangement, what to change.
Front Desk: We're a full-service studio — our projects include design and execution together. We don't do advisory or consultation-only visits. If you're planning a full redesign with execution, we'd be a great fit.
Caller: Oh I see. No, we're just exploring for now. Maybe later.
Front Desk: Of course — feel free to call back when you're ready to go ahead with a full project.`,
    aiSummary: "Caller looking for interior advice/styling only with no execution commitment. Not our service model — declined gracefully.",
  },
  {
    id: "T05",
    callerName: "Aarti Mehta",
    callerPhone: "+919900000005",
    callTimestamp: new Date("2026-09-05T10:52:00+05:30"),
    durationSeconds: 404,
    projectLocation: "Koregaon Park",
    propertyType: "4BHK",
    squareFeet: 2400,
    projectScope: "Complete redesign — new flooring, kitchen, all four bedrooms",
    timeline: "Back by February, about 4 months",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: Hi, this is Aarti Mehta. Vikram Agarwal asked me to call — he's a close friend of Nikhil's.
Front Desk: Of course, thank you. What are you looking for?
Caller: We have a 4BHK in Koregaon Park — about 2,400 sq ft carpet. Complete redesign. New flooring, kitchen, all four bedrooms. We've already moved out temporarily.
Front Desk: That's a significant project. Do you have a timeline?
Caller: We want to move back in by February. About 4 months.
Front Desk: That should work well. Would you prefer a site visit for the consultation?
Caller: Yes please — Vikram said your team does that.
Front Desk: Absolutely. Can I check your availability for early next week?`,
    aiSummary: "High-value referral via Vikram Agarwal (Nikhil's contact). 4BHK, Koregaon Park, 2,400 sq ft. Full redesign — flooring, kitchen, all bedrooms. Already vacated. Timeline: February. Strong lead.",
  },
  {
    id: "T06",
    callerName: null,
    callerPhone: "+919900000006",
    callTimestamp: new Date("2026-09-05T15:28:00+05:30"),
    durationSeconds: 301,
    projectLocation: "Baner",
    propertyType: "Office",
    squareFeet: 800,
    projectScope: "Full commercial fitout — workstations, cabin, meeting room, common areas",
    timeline: "Operational by December",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: Hi, I'm calling about a commercial project. We're a startup — just got our first proper office space in Baner. About 800 sq ft. We need workstations for 20 people, a small cabin, a meeting room, and a break area.
Front Desk: We do commercial fitouts up to about 3,000 sq ft. What's the state of the space right now?
Caller: Bare shell — just columns and floor. Nothing else.
Front Desk: Full fitout from scratch. And the timeline?
Caller: We want to be operational by December. Our team is working from home currently.
Front Desk: December is doable. Are you the decision-maker for this?
Caller: Yes, I'm the founder.
Front Desk: Perfect. Let's set up a consultation.`,
    aiSummary: "Startup founder looking to fitout a bare-shell 800 sq ft office in Baner. Workstations for 20, cabin, meeting room, break area. Target: December. Decision-maker on call. Good commercial lead.",
  },
  {
    id: "T07",
    callerName: null,
    callerPhone: "+919900000007",
    callTimestamp: new Date("2026-09-08T09:44:00+05:30"),
    durationSeconds: 195,
    projectLocation: null,
    propertyType: "Living room + Kitchen",
    squareFeet: null,
    projectScope: "Living room and kitchen redesign before Diwali",
    timeline: "Before Diwali — 3 weeks",
    isDecisionMaker: null,
    askedAboutPrice: false,
    rejectionReason: "Timeline is too short — we cannot begin execution within the required timeframe.",
    transcript: `Caller: Hello — I want to redo my living room and kitchen before Diwali. Can you take it up?
Front Desk: Diwali is about three weeks away. Our design phase alone takes 3-4 weeks, and execution follows. We couldn't do justice to a project in that time.
Caller: Even just the living room?
Front Desk: Even so — a room redesign with execution takes at least 8-10 weeks from start to finish. We wouldn't want to rush it.
Caller: What if I start after Diwali?
Front Desk: A November start would work well. Shall I note your details for that?
Caller: Let me think and call back.`,
    aiSummary: "Caller wanted living room and kitchen done before Diwali (3 weeks). Impossible timeline for our execution model. Offered November start — caller will think about it.",
  },
  {
    id: "T08",
    callerName: null,
    callerPhone: "+919900000008",
    callTimestamp: new Date("2026-09-09T22:47:00+05:30"),
    durationSeconds: 0,
    projectLocation: "Nanded City, Pune",
    propertyType: null,
    squareFeet: null,
    projectScope: null,
    timeline: null,
    isDecisionMaker: null,
    askedAboutPrice: false,
    isMissed: true,
    aiSummary: "Missed call. Number associated with Nanded City area. Call-back attempted following morning — no answer.",
  },
  {
    id: "T10",
    callerName: null,
    callerPhone: "+919900000010",
    callTimestamp: new Date("2026-09-11T14:04:00+05:30"),
    durationSeconds: 220,
    projectLocation: "Kharadi",
    propertyType: "1BHK",
    squareFeet: 550,
    projectScope: "Kitchen and one bedroom redesign",
    timeline: null,
    isDecisionMaker: null,
    budgetMentioned: "1 to 1.5 lakh maximum",
    askedAboutPrice: false,
    rejectionReason: "Budget is significantly below the minimum for the stated scope.",
    transcript: `Caller: Hi. I have a 1BHK in Kharadi — about 550 sq ft. I want to do the kitchen and one bedroom. My budget is 1 to 1.5 lakh maximum for everything. Is that possible with you?
Front Desk: I appreciate you sharing that. For a kitchen redesign and a bedroom with full execution — materials, furniture, and contractor work — 1 to 1.5 lakh would be significantly below what a project of that scope would cost with us.
Caller: Even for one bedroom?
Front Desk: Even for one room. I wouldn't want to bring you to a consultation if the numbers don't align. I'd suggest checking with local contractors who work at that price point.
Caller: Okay, thank you for being straight.`,
    aiSummary: "1BHK in Kharadi, kitchen and bedroom. Budget of ₹1-1.5 lakh stated upfront — significantly below our minimum. Declined honestly with referral to local contractors.",
  },
  {
    id: "T11",
    callerName: null,
    callerPhone: "+919900000011",
    callTimestamp: new Date("2026-09-12T10:18:00+05:30"),
    durationSeconds: 382,
    projectLocation: "Baner",
    propertyType: "2BHK",
    squareFeet: null,
    projectScope: "Living room, bedroom, and kitchen redesign (rented apartment, reversible changes)",
    timeline: null,
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: Hi — I have a question. I'm in a rented apartment. Can you still take up a project?
Front Desk: It depends on the scope. What are you looking to do?
Caller: It's a 2BHK in Baner. I've been here a year, I have a 3-year lease, and the place is quite bare. I want to properly design the living room, bedroom, and kitchen — no structural changes, just design and fittings.
Front Desk: That's fine — we've done rented apartments before. For the kitchen we'd do a modular unit that can come out cleanly. The rest is largely flooring, lighting, and furniture — all reversible. Have you checked with your landlord?
Caller: Yes — they're fine with it as long as we don't break walls.
Front Desk: Perfect. No wall-breaking from us. Shall we set up a consultation?
Caller: Yes please.`,
    aiSummary: "Rented apartment in Baner — 2BHK. Full design scope (living, bedroom, kitchen). Landlord confirmed no structural changes. Long lease. Good lead.",
  },
  {
    id: "T12",
    callerName: "Anand Sharma",
    callerPhone: "+919900000012",
    callTimestamp: new Date("2026-09-15T10:05:00+05:30"),
    durationSeconds: 450,
    projectLocation: "Kalyani Nagar",
    propertyType: "Villa",
    squareFeet: 5500,
    projectScope: "Full end-to-end design — ground plus two floors",
    timeline: "March next year — no rush",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: I'm calling about a villa project in Kalyani Nagar. My name is Anand Sharma. The property is about 5,500 sq ft — ground plus two floors. Full end-to-end design.
Front Desk: That's a significant project. Is this a new property or an existing home?
Caller: New construction. Possession was last month. Completely empty.
Front Desk: And your timeline?
Caller: March next year to move in. No rush.
Front Desk: Good time to start. Would you like our principal designer to come to site for the first consultation?
Caller: Yes — this week or next if possible.
Front Desk: Let me check the calendar and revert by end of day.`,
    aiSummary: "Villa in Kalyani Nagar — 5,500 sq ft, 3 floors. Brand new possession last month. Full design and execution. Timeline: March. High-value project. Decision-maker on call. Request for principal designer site visit.",
  },
  {
    id: "T13",
    callerName: null,
    callerPhone: "+919900000013",
    callTimestamp: new Date("2026-09-16T12:19:00+05:30"),
    durationSeconds: 368,
    projectLocation: "Aundh",
    propertyType: "3BHK",
    squareFeet: 1100,
    projectScope: "Kitchen, wardrobes in both bedrooms, living room",
    timeline: null,
    isDecisionMaker: null,
    askedAboutPrice: true,
    transcript: `Caller: Hi — I want to redo my flat in Aundh. 3BHK, about 1,100 sq ft. What might it cost?
Front Desk: Our pricing depends on the materials and scope — the designers go through that at the consultation. What are you planning?
Caller: Kitchen, wardrobes in both bedrooms, living room. But seriously — can't you give me even a rough range? I just want to know if we're in the same ballpark.
Front Desk: I really can't give a number that would mean anything without seeing the site and the spec. The difference between a standard and a premium kitchen alone can be 3× the cost. The consultation is free — the designer will give you a proper number by the end of it.
Caller: Fine. Let's book then.
Front Desk: Perfect. What days work for you?`,
    aiSummary: "3BHK in Aundh, 1,100 sq ft. Kitchen, wardrobes, living room. Caller pressed for pricing multiple times — standard response given. Eventually agreed to book consultation.",
  },
  {
    id: "T15",
    callerName: "Smita",
    callerPhone: "+919900000015",
    callTimestamp: new Date("2026-09-18T15:12:00+05:30"),
    durationSeconds: 344,
    projectLocation: "Undri",
    propertyType: "2BHK",
    squareFeet: 875,
    projectScope: "Full home — kitchen, wardrobes, living room",
    timeline: "Getting possession in 6 weeks, start right away",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: Hi, I'm Smita. I'm getting possession of my flat in Undri in about six weeks. 2BHK, 875 sq ft. I want to start the design right away.
Front Desk: Six weeks is just enough lead time to get the design finalised before execution begins. What are you planning?
Caller: Full home — kitchen, wardrobes, living room. The full package.
Front Desk: Good scope. Are you the owner?
Caller: Yes — my husband and I. He said to go ahead and book the consultation.
Front Desk: Can we see the site in its current state, or do you need to wait for possession?
Caller: We can go now — the builder will let us in.
Front Desk: Even better. Let me get a designer's availability.`,
    aiSummary: "2BHK in Undri, 875 sq ft. Full scope — kitchen, wardrobes, living room. Possession in 6 weeks — builder allowing early access. Both owners aligned. Good lead.",
  },
  {
    id: "T17",
    callerName: "Ritu Kapoor",
    callerPhone: "+919900000017",
    callTimestamp: new Date("2026-09-22T14:16:00+05:30"),
    durationSeconds: 270,
    projectLocation: "Pimple Saudagar",
    propertyType: "3BHK",
    squareFeet: 1050,
    projectScope: "Kitchen, wardrobes, living room",
    timeline: "By March — plenty of time",
    isDecisionMaker: null,
    askedAboutPrice: false,
    transcript: `Caller: Hi — I called just now and got cut off. I'm Ritu Kapoor from Pimple Saudagar. 3BHK, about 1,050 sq ft. We've been here two years but never properly did the interiors. We want to start now.
Front Desk: Thanks for calling back. Pimple Saudagar is in our service area. What are you looking to do?
Caller: Kitchen, wardrobes, living room. We moved in with builder furniture and it's very basic.
Front Desk: Standard full-home scope. Timeline?
Caller: Ideally done by March. Plenty of time.
Front Desk: Perfect. Let me book a consultation.`,
    aiSummary: "3BHK in Pimple Saudagar, 1,050 sq ft. Kitchen, wardrobes, living room — full redesign. Timeline: March. Second call after disconnection — motivated caller.",
  },
  {
    id: "T19",
    callerName: null,
    callerPhone: "+919900000019",
    callTimestamp: new Date("2026-09-24T16:02:00+05:30"),
    durationSeconds: 170,
    projectLocation: "Koregaon Park",
    propertyType: "Restaurant",
    squareFeet: null,
    projectScope: "Restaurant interior design",
    timeline: null,
    isDecisionMaker: null,
    askedAboutPrice: false,
    rejectionReason: "Project scope doesn't match our services — we require design + execution.",
    transcript: `Caller: Hi — I'm planning to open a restaurant in Koregaon Park. I've seen your work and I love it. Would you be able to design the interiors?
Front Desk: We appreciate you reaching out. Restaurant and hospitality interiors are outside our current scope — we focus on residential and office spaces. For a restaurant you'd need a studio that specialises in commercial hospitality, which has very different material and compliance requirements.
Caller: Do you know anyone you could refer?
Front Desk: I don't have a specific referral I could make confidently, but searching for hospitality interior designers in Pune would give you more relevant options.
Caller: Alright, thanks.`,
    aiSummary: "Caller planning to open a restaurant in Koregaon Park. Restaurants are outside our scope. Declined gracefully — referred to hospitality specialists.",
  },
  {
    id: "T20",
    callerName: "Pooja",
    callerPhone: "+919900000020",
    callTimestamp: new Date("2026-09-25T09:15:00+05:30"),
    durationSeconds: 284,
    projectLocation: "Magarpatta",
    propertyType: "2BHK",
    squareFeet: 900,
    projectScope: "Kitchen, both bedrooms, living room",
    timeline: "January execution",
    isDecisionMaker: true,
    askedAboutPrice: false,
    transcript: `Caller: Good morning. I'm Pooja. I have a 2BHK in Magarpatta — Cybercity area. We've been wanting to properly design the interiors for a while. Kitchen, both bedrooms, living room. About 900 sq ft.
Front Desk: Good scope for us. How soon are you looking to start?
Caller: We're flexible — a January start for execution would be ideal.
Front Desk: That works well. Are you the owner?
Caller: Yes — my husband and I. We both want to be at the consultation.
Front Desk: Excellent. Can I book that now?
Caller: Please.`,
    aiSummary: "2BHK in Magarpatta, 900 sq ft. Kitchen, both bedrooms, living room. January execution start. Both owners aligned and attending consultation. Strong, clean lead.",
  },
];

async function seed() {
  console.log("🌱 Seeding Aangan Studio database…");

  // Create demo users
  const designerHash = await bcrypt.hash("designer123", 12);
  const founderHash = await bcrypt.hash("founder123", 12);

  const [designer, founder] = await db.insert(users).values([
    {
      name: "Priya Desai",
      email: "priya@aangan.studio",
      passwordHash: designerHash,
      role: "designer",
      calcomUsername: "priya-aangan",
    },
    {
      name: "Nikhil Deshpande",
      email: "nikhil@aangan.studio",
      passwordHash: founderHash,
      role: "founder",
    },
  ]).returning();

  console.log(`✅ Created ${2} users`);

  // Seed calls
  let qualifiedCount = 0, rejectedCount = 0, pendingCount = 0;

  for (const callData of SEED_CALLS) {
    // Create or find customer
    const [customer] = await db.insert(customers).values({
      name: callData.callerName || undefined,
      phone: callData.callerPhone,
      location: callData.projectLocation || undefined,
    }).returning();

    // Run qualification
    const qualInput = {
      projectScope: callData.projectScope || undefined,
      projectLocation: callData.projectLocation || undefined,
      timeline: callData.timeline || undefined,
      budgetMentioned: (callData as { budgetMentioned?: string }).budgetMentioned,
      isDecisionMaker: callData.isDecisionMaker ?? undefined,
      squareFeet: callData.squareFeet || undefined,
    };

    const qualification = qualifyLead(qualInput);

    // Override with known rejection reason if provided
    if ((callData as { rejectionReason?: string }).rejectionReason) {
      (qualification as { rejectionReason?: string }).rejectionReason = (callData as { rejectionReason?: string }).rejectionReason;
    }

    const handoffNote = generateHandoffNote(
      callData.callerName,
      { ...qualInput, askedAboutPrice: callData.askedAboutPrice },
      qualification,
      callData.aiSummary
    );

    const isMissed = !!(callData as { isMissed?: boolean }).isMissed;

    const [call] = await db.insert(calls).values({
      vaaniCallId: `seed-${callData.id}`,
      customerId: customer.id,
      callerPhone: callData.callerPhone,
      callerName: callData.callerName || undefined,
      callTimestamp: callData.callTimestamp,
      durationSeconds: callData.durationSeconds,
      projectLocation: callData.projectLocation || undefined,
      propertyType: callData.propertyType || undefined,
      squareFeet: callData.squareFeet || undefined,
      projectScope: callData.projectScope || undefined,
      timeline: callData.timeline || undefined,
      isDecisionMaker: callData.isDecisionMaker ?? undefined,
      budgetMentioned: (callData as { budgetMentioned?: string }).budgetMentioned,
      askedAboutPrice: callData.askedAboutPrice,
      outcome: isMissed ? "missed" : qualification.outcome,
      leadStatus: isMissed ? "pending_review" : qualification.status,
      qualificationNotes: qualification.notes,
      rejectionReason: qualification.rejectionReason,
      aiSummary: callData.aiSummary,
      handoffNote,
      qualificationCriteria: qualification.criteria as Record<string, unknown>,
      isMissed,
      aiCostUsd: (!isMissed && callData.durationSeconds > 0 ? (callData.durationSeconds * 0.0004).toFixed(4) : null) as unknown as undefined,
      assignedDesignerId: qualification.status === "qualified" ? designer.id : undefined,
    }).returning();

    // Add transcript for calls with one
    if ((callData as { transcript?: string }).transcript && !isMissed) {
      await db.insert(transcripts).values({
        callId: call.id,
        fullText: (callData as { transcript?: string }).transcript,
      });
    }

    // Add meeting for qualified calls
    if (qualification.status === "qualified") {
      await db.insert(meetings).values({
        callId: call.id,
        designerId: designer.id,
        meetingStatus: "booking_sent",
        bookingLink: `https://cal.com/priya-aangan/consultation`,
      });
    }

    if (qualification.status === "qualified") qualifiedCount++;
    else if (qualification.status === "rejected") rejectedCount++;
    else pendingCount++;

    console.log(`  ${callData.id} → ${qualification.status} (${qualification.outcome})`);
  }

  console.log(`\n✅ Seeded ${SEED_CALLS.length} calls:`);
  console.log(`   Qualified: ${qualifiedCount}`);
  console.log(`   Rejected: ${rejectedCount}`);
  console.log(`   Pending: ${pendingCount}`);
  console.log("\n🔑 Demo credentials:");
  console.log("   Designer: priya@aangan.studio / designer123");
  console.log("   Founder:  nikhil@aangan.studio / founder123");
}

seed().catch(console.error).finally(() => process.exit());
