export interface StepMeta {
  id: number;
  title: { en: string; sw: string };
  question: { en: string; sw: string };
  helper: { en: string; sw: string };
  tip: { en: string; sw: string };
}

export const STEP_META: StepMeta[] = [
  {
    id: 1,
    title: { en: "Shop Identity", sw: "Utambulisho wa Duka" },
    question: { en: "What is your shop called?", sw: "Duka lako linaitwa nini?" },
    helper: { en: "Just a name and a phone number. That is enough to start selling.", sw: "Jina na namba ya simu tu. Hivyo vya kutosha kuanza kuuza." },
    tip: {
      en: "Shops with a clear name and phone number get up to 3x more customer calls from the public directory.",
      sw: "Maduka yenye jina bayana na namba ya simu hupokea simu mara 3 zaidi kutoka kwenye orodha ya umma.",
    },
  },
  {
    id: 2,
    title: { en: "Products & Prices", sw: "Bidhaa na Bei" },
    question: { en: "What do you sell, and how do you price it?", sw: "Unauza nini na bei huwekaje?" },
    helper: { en: "This sets up your till: categories, units and currency.", sw: "Hii huweka kasha lako: makundi, vipimo na sarafu." },
    tip: {
      en: "Your categories decide where buyers find you on the marketplace, so select all that apply.",
      sw: "Makundi unayochagua ndiyo yanayoamua wanunuzi watakupata wapi sokoni, chagua yote yanayohusika.",
    },
  },
  {
    id: 3,
    title: { en: "Reach More Buyers", sw: "Fikia Wanunuzi Zaidi" },
    question: { en: "Want to sell beyond your shop gate?", sw: "Unataka kuuza ngumu zaidi ya mlangi wa duka?" },
    helper: { en: "Optional. Switch it on to appear in the Twende Duka directory and post to social. You can change this any time.", sw: "Si lazima. Washa ionekane duka lako kwenye orodha ya Twende Duka na kwenye mitandao. Unaweza kubadilisha wakati wowote." },
    tip: {
      en: "A GPS pin and a short description put your shop on the directory map — the two things buyers filter by first.",
      sw: "Alama ya GPS na maelezo mafupi heweka duka lako kwenye ramani ya orodha — mambo mawili ambayo wanunuzi huataja kwanza.",
    },
  },
  {
    id: 4,
    title: { en: "Review & Finish", sw: "Pitia & Maliza" },
    question: { en: "Does everything look right?", sw: "Je, kila kitu kipo sahihi?" },
    helper: { en: "Confirm your details before we create the shop.", sw: "Hakikisha taarifa ni sahihi kabla ya kusajili." },
    tip: {
      en: "You can change any of these settings later, and add more shops to the same account.",
      sw: "Unaweza kubadilisha mipangilio hii yoyote baadaye, na kuongeza maduka mengine kwenye akaunti hii.",
    },
  },
];
