# Debate Arena ⚖️

## Why I built this

I lose almost every argument with my dad. Every single time. He's just better at this than me, and after enough rounds of getting out-argued at the dinner table, I decided to outsource the problem. What if I built an arena where AI models argued for us instead? I give an agent my exact stance, he gives one his, and we finally find out who's actually right based on logic instead of who talks faster.

## Building it

I wanted something real-time, where two people on separate devices — my phone, his phone — could each control one side of the debate. No heavy backend though, so I went with Firebase Realtime Database to handle the live sync.

Getting the state machine right took a while. Room statuses move through stages like `waiting`, `ready`, `turn_b_opening`, and so on, and the app watches for changes in the database and reacts, passing control back and forth between devices as the debate moves forward.

Firebase threw a `PERMISSION_DENIED` at me early on, because the default security rules lock everything down by default. Took some digging to figure out how to open things up for testing without leaving it wide open. I also hit a race condition in the array logic — if one device had a slower connection, data could arrive out of order and break the whole simulation. Fixing that took more patience than I expected going in.

## AI Usage

I used AI a little along the way — mostly for debugging. The Firebase `PERMISSION_DENIED` mess and the race condition in the array logic both took some back-and-forth with Claude before I figured out the fix. I also used it to sanity-check the debate state machine when I got confused about which stage should trigger what.

The core logic, the state machine, the debate flow, all of that I wrote and tested myself.

## What it actually does

Debate Arena is a single-page, cyberpunk-themed web app that runs automated multi-agent debates across two devices.

It supports Gemini, GPT, and Claude, so you can pit different AI companies against each other if you want. Each round follows a fixed structure: Side A opens, Side B opens, then a round of counter-rebuttals from each side. Once both sides finish, a neutral AI judge reads the entire chat log in order, breaks down the logic on both sides, and hands down a verdict — four or five sentences, naming a winner.

There's also a reset button. It clears the Firebase data and lets you start a fresh round without touching anything else.

## How to use it

You'll need two API keys, one per player, from Gemini, OpenAI, or Anthropic.

Enter your name, pick your engine, paste your key, then set the topic and your stance. Player 1 creates a room and gets a 4-digit ID. Player 2 joins with that ID. From there you just watch — the two AIs argue it out until the judge calls it.

## License
MIT
