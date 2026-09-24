import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const writeups = (await getCollection("writeups"))
    .filter((writeup) => !writeup.data.draft)
    .sort(
      (a, b) =>
        b.data.date.valueOf() - a.data.date.valueOf()
    );

  return rss({
    title: "0xWizard | Application Security × Bug Hunter × Chess Player",

    description:
      "Application security, bug hunting, security research, projects, and more by Kwesi Larry.",

    site: context.site,

    items: writeups.map((writeup) => ({
      title: writeup.data.title,

      description:
        writeup.data.description ??
        "A 0xWizard security write-up.",

      pubDate: writeup.data.date,

      link: `/writeups/${writeup.id}/`,
    })),

    customData: `
      <language>en</language>
      <copyright>© ${new Date().getFullYear()} Kwesi Larry</copyright>
    `,
  });
}
