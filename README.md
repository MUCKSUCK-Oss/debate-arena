# Debate Arena ⚖️🤖

## Why I Built This (The Backstory)

I built this project because of a very specific personal struggle: I always seem to lose arguments and debates against my dad. No matter how hard I try, he always out-argues me!

After losing one too many debates, I realized I needed a worthy champion to stand in my corner. I wanted to see what would happen if I brought world-class AI models into the ring to fight my battles for me. I designed this Debate Arena so that I can give an AI agent my exact stance and let it go toe-to-toe with another AI agent representing my dad's side, allowing us to see who actually wins based on pure logic.

## My Journey Behind Making It

Building this app was a huge learning experience. I wanted a true real-time, multiplayer setup where two people could participate from separate devices (like my phone and my dad's phone) without me having to build a heavy, complicated backend server.

To solve this, I chose **Firebase Realtime Database** to act as our live coordination bridge.

* **The State Machine:** I had to map out a strict synchronization flow using room statuses (`waiting` ➔ `ready` ➔ `turn_b_opening` ➔ etc.). The app listens for changes in the database and automatically takes over, passing the microphone back and forth between the devices seamlessly.
* **Roadblocks Face-Off:** Along the way, I ran into a classic Firebase `PERMISSION_DENIED` roadblock because the database rules were completely locked down by default. I had to learn how to open up the security rules for my test environment to get the devices communicating. I also had to patch structural race conditions in the array logic to ensure that if one device had a slower internet speed, the data wouldn't fetch out of order and crash the simulation.

## What It Is & How It Works

Debate Arena is a cyberpunk-themed, single-page web sandbox that orchestrates automated multi-agent debates across multiple devices.

* **Multi-Engine Support:** It supports API endpoints for Google Gemini, OpenAI GPT, and Anthropic Claude—meaning you can even pit different AI companies against each other.
* **Formal Structure:** The app automatically runs a complete formal debate: Side A Opening Statement ➔ Side B Opening Statement ➔ Side A Counter-Rebuttal ➔ Side B Final Counter-Defense.
* **The Court Verdict:** At the end of the round, a completely neutral AI Court Judge parses the entire chronologically sorted chat history, breaks down the logic, and delivers an official 4-to-5 sentence verdict declaring the ultimate winner.
* **Instant Rematch:** Once a round concludes, a reset feature clears out the current data logs from Firebase, resetting the board so both participants can start a brand new round with the click of a button.

## How to Use It

1. **API Keys:** You will need two separate API keys (one for each player) from Gemini, OpenAI, or Anthropic.
2. **Setup Panel:** Enter your name, choose your AI engine, paste your key, and input the debate topic along with your premise/stance.
3. **Room Sync:** Player 1 clicks **Create New Arena Room** to generate a unique 4-digit Room ID. Player 2 enters that exact Room ID on their device and clicks **Join Existing Room**.
4. **Sit Back:** Watch your AI champions battle it out live until the Court Judge announces the final verdict!

## License
MIT
