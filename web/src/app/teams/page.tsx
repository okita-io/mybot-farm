import { permanentRedirect } from "next/navigation";

export default function TeamsIndexPage() {
  permanentRedirect("/about#teams");
}
