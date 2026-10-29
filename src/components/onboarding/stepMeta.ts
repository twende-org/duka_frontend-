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
    helper: {
      en: "Just a name and a phone number. That is enough to start selling.",
      sw: "Jina na namba ya simu tu. Hicho kinatosha kuanza kuuza.",
    },
    tip: {
      en: "Shops with a clear name and phone number get up to 3x more customer calls from the public directory.",
      sw: "Maduka yenye jina wazi na namba ya simu hupokea mialiko ya wateja mara 3 zaidi kutoka kwenye orodha ya maduka.",
    },
  },
  {
    id: 2,
    title: { en: "Products & Prices", sw: "Bidhaa na Bei" },
    question: { en: "What do you sell, and how do you price it?", sw: "Unauza nini, na huweka bei aje?" },
    helper: {
      en: "This sets up your till: categories, units and currency.",
      sw: "Hii huweka mfumo wako wa kuuzia: makundi ya bidhaa, vipimo na sarafu.",
    },
    tip: {
      en: "Your categories decide where buyers find you on the marketplace, so select all that apply.",
      sw: "Makundi unayochagua huamua wanunuzi watakupatapo sokoni. Chagua yote yanayokuhusu.",
    },
  },
  {
    id: 3,
    title: { en: "Reach More Buyers", sw: "Fikia Wanunuzi Zaidi" },
    question: { en: "Want to sell beyond your shop gate?", sw: "Unataka kuuza kwa wanunuzi wa nje ya duka lako?" },
    helper: {
      en: "Optional. Switch it on to appear in the Twende Duka directory and post to social. You can change this any time.",
      sw: "Si lazima. Ukkiwasha, duka lako litaonekana kwenye orodha ya Twende Duka na utaweza kutangaza kwenye mitandao. Unaweza kubadilisha wakati wowote.",
    },
    tip: {
      en: "A GPS pin and a short description put your shop on the directory map — the two things buyers filter by first.",
      sw: "Alama ya GPS na maelezo mafupi hweka duka lako kwenye ramani ya orodha. Ndiyo mambo mawili wanunuzi wanayotafuta kwanza.",
    },
  },
  {
    id: 4,
    title: { en: "Review & Finish", sw: "Pitia & Maliza" },
    question: { en: "Does everything look right?", sw: "Je, kila kitu kipo sahihi?" },
    helper: {
      en: "Confirm your details before we create the shop.",
      sw: "Hakikisha taarifa zote ni sahihi kabla ya kumaliza.",
    },
    tip: {
      en: "You can change any of these settings later, and add more shops to the same account.",
      sw: "Mipangilio hii unaweza kuibadilisha baadaye, na kuongeza maduka mengine kwenye akaunti hii.",
    },
  },
];
