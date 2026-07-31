import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 4400;

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
    console.log(`\nNETLINK API LISTENING ON PORT ${PORT}`);
});