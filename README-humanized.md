# Debate Arena ⚖️

## Why I built this

Let's be real: I lose basically every argument I have with my dad. The guy is just relentless. After getting out-talked at the dinner table for the millionth time, I figured I'd try outsourcing the problem entirely. 

The idea was to build a digital ring where AI models could do the arguing for us. I punch in my stance, he enters his, and we let the bots fight it out. That way, we finally see who's actually right based on straight logic, rather than who can talk the loudest or fastest.

## Building it

The goal was to make it real-time. I wanted to be on my phone, him on his, each of us controlling our own side. I really didn't want to spin up a heavy backend for this, so I just used Firebase Realtime Database to handle the syncing.

Honestly, the state machine was kind of a headache to get right. The room has to cycle through stages (like `waiting`, `ready`, `turn_b_opening`, etc.). The client just watches the database for changes and passes control back and forth as the argument progresses.

I ran into some annoying Firebase issues early on. Got hit with a `PERMISSION_DENIED` error because their default security rules lock down everything. Took a bit of digging to open it up for testing without leaving the database totally exposed. I also hit a nasty race condition. If one person's internet was lagging, data arrived out of order and completely tanked the simulation. Figuring that out tested my patience way more than I thought it would.

## What it actually does

So, what is it? Debate Arena is basically a single-page web app (styled with a cyberpunk vibe) that runs multi-agent AI debates across two different devices.

It hooks into Gemini, GPT, and Claude. You can actually pit different AI models against each other, which is pretty fun. The flow is strictly fixed: Side A gives an opening statement, Side B gives theirs, and then both sides do counter-rebuttals. Once they finish arguing, a neutral "judge" AI reads the whole chat log, breaks down the logic, and spits out a verdict in about 4 or 5 sentences naming the winner.

Oh, and I added a reset button. It just wipes the Firebase data so you can instantly start a new debate round.

## Setup

Easiest way to try it? Just head over to [mucksuck-oss.github.io/debate-arena](https://mucksuck-oss.github.io/debate-arena). It's live right now, no setup required.

If you want to run it locally to mess with the code, just clone the repo:

```bash
git clone https://github.com/MUCKSUCK-Oss/debate-arena.git
cd debate-arena
```

There's absolutely no build step. No `npm install` to wait for, nothing to compile. You literally just open `index.html` in your browser and you're good to go.

Whether you use the live site or run it locally, you are going to need an API key from whatever AI engine you want to use:

*   Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
*   OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
*   Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

Don't worry about setting up a database or a backend—Firebase and the CORS proxy are already handled on my end. Just bring your API key, choose your model, and jump in.

## How to use it

To play against someone, both of you need your own API keys (from Gemini, OpenAI, or Anthropic).

First, put in your name, pick the AI engine you want to use, and paste in your key. Type out the topic and what your stance is. Player 1 creates the room, which generates a random 4-digit ID. Player 2 just types in that ID to join.

Once you're both in the room, the app completely takes over. Side A talks, Side B talks, they throw some rebuttals at each other, and you just sit back and watch the bots fight. Finally, the judge reads the log and picks the winner.

Whenever you want to argue about something else, just hit reset. It clears the room state without messing up anything else.

## AI Usage

Full transparency, I did use AI to help build this—mostly just to debug annoying stuff. That Firebase `PERMISSION_DENIED` error and the race condition I mentioned earlier took a lot of back-and-forth prompting with Claude before I finally found the fix. I also used it to double-check my logic for the state machine when I got lost in the weeds of which stage triggered what.

But all the core logic, the debate flow, and actually wiring up the state machine? I wrote and tested all of that by hand.

## License

MIT