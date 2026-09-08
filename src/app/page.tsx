import { redirect } from "next/navigation";

// Browse-first landing: the app opens directly on the plate grid the user
// needs most, not a title page.
export default function Home() {
  redirect("/screens");
}
