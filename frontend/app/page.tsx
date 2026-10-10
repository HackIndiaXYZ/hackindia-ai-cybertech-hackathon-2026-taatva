import { redirect } from "next/navigation";

// TAATVA Obsidian - the home page simply opens the Scan screen.
export default function Home() {
  redirect("/scan");
}
