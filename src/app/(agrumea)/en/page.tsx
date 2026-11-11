import { redirect } from "next/navigation";

// The clone scope covers /en/dispensa and its product pages; /en itself was not cloned.
export default function EnHome() {
  redirect("/en/dispensa");
}
