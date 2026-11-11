import type { Metadata } from "next";
import { StorySection } from "@/components/story-section";

export const metadata: Metadata = {
  title: "Contacts | Agrumea Farm",
  description:
    "Contact Agrumea Farm — drop us a line, we'd be delighted to tell you all about our farm and products.",
};

const contacts = [
  { label: "Email", href: "mailto:info@agrumeafarm.it", text: "info@agrumeafarm.it" },
  { label: "Shop", href: "https://www.riblo.it/agrumea-farm/", text: "riblo.it/agrumea-farm" },
];

export default function ContactsPage() {
  return (
    <StorySection kicker="Contacts" title="Drop us a line." offset>
      <p className="story-text">
        Do you have a question or would you like to find out more about us? We&rsquo;d be
        delighted to tell you all about Agrumea Farm.
      </p>
      <div className="contact-list">
        {contacts.map((c) => (
          <p key={c.label} className="contact-item">
            {c.label}:{" "}
            <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {c.text}
            </a>
          </p>
        ))}
        <p className="contact-item">Agrumea Farm — Azienda Agricola Sebastiano Piazza, Sicily</p>
      </div>
    </StorySection>
  );
}
