import { createApp } from "./app";

const PORT = process.env.PORT || 4400;

const app = createApp();

app.listen(PORT, () => {
    console.log(`\nNETLINK API LISTENING ON PORT http://localhost:${PORT}`);
});