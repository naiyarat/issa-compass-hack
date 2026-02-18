export type UiChatMessage = {
  role: "consultant" | "client";
  message: string;
};

export type GenerateReplyPreset = {
  id: string;
  label: string;
  clientSequence: string;
  chatHistory: UiChatMessage[];
};

export type ImproveAiPreset = {
  id: string;
  label: string;
  clientSequence: string;
  chatHistory: UiChatMessage[];
  consultantReply: string;
};

export const generateReplyPresets: GenerateReplyPreset[] = [
  {
    id: "synth001-1",
    label: "SYNTH_001 - Initial DTV inquiry",
    clientSequence:
      "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
    chatHistory: [],
  },
  {
    id: "synth001-2",
    label: "SYNTH_001 - Apply from Indonesia question",
    clientSequence: "I'm American and currently in Bali. Can I apply from Indonesia?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
    ],
  },
  {
    id: "synth004-1",
    label: "SYNTH_004 - Freelancer eligibility",
    clientSequence: "Hi, I'm a freelance graphic designer. Can I apply for DTV?",
    chatHistory: [],
  },
  {
    id: "synth010-1",
    label: "SYNTH_010 - Muay Thai training inquiry",
    clientSequence: "Hey! Want to train Muay Thai in Thailand for 6 months. Heard about DTV visa.",
    chatHistory: [],
  },
  {
    id: "synth005-1",
    label: "SYNTH_005 - Document issues",
    clientSequence: "Hi I uploaded my documents but got feedback saying address proof is not acceptable?",
    chatHistory: [],
  },
  {
    id: "synth001-3",
    label: "SYNTH_001 - Documents preparation",
    clientSequence: "What documents do I need to prepare?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
      {
        role: "client",
        message: "I'm American and currently in Bali. Can I apply from Indonesia?",
      },
      {
        role: "consultant",
        message:
          "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
      },
    ],
  },
  {
    id: "synth010-2",
    label: "SYNTH_010 - Gym enrollment question",
    clientSequence: "Sure, Laos works. What gym should I enroll at?",
    chatHistory: [
      {
        role: "client",
        message: "Hey! Want to train Muay Thai in Thailand for 6 months. Heard about DTV visa.",
      },
      {
        role: "consultant",
        message: "Hi there! Yes, Muay Thai training qualifies for the DTV under the soft power/cultural activities category. This is a popular option! Where are you from and where would you like to apply?",
      },
      {
        role: "client",
        message: "I'm British. Currently traveling in Southeast Asia. Maybe apply from Cambodia?",
      },
      {
        role: "consultant",
        message: "Cambodia is possible, but for Muay Thai DTVs, we actually recommend Laos for the highest approval rates. The embassy there is very familiar with soft power applications. Would you consider applying from Vientiane instead?",
      },
    ],
  },
  {
    id: "synth004-2",
    label: "SYNTH_004 - Business document translation",
    clientSequence: "My business documents are in German. Do I need official translations?",
    chatHistory: [
      {
        role: "client",
        message: "Hi, I'm a freelance graphic designer. Can I apply for DTV?",
      },
      {
        role: "consultant",
        message: "Hello! Yes, freelancers and self-employed individuals can apply for the DTV. May I know your nationality and where your business is registered?",
      },
      {
        role: "client",
        message: "I'm German. My business is registered in Germany. I have clients from various countries.",
      },
      {
        role: "consultant",
        message: "Great! For self-employed applicants, you'll need to demonstrate that your work is location-independent and you won't be working with Thai clients. Where do you plan to submit your application?",
      },
      {
        role: "client",
        message: "I'm currently in Malaysia. Can I apply here?",
      },
      {
        role: "consultant",
        message: "Yes, Malaysia is a good option! For self-employed applicants, you'll need:\n\n1. Business registration documents (translated to English if in German)\n2. Bank statements showing 500,000 THB equivalent for 3 months\n3. Client contracts or invoices from the past 3 months\n4. Proof of income showing payments from clients\n5. Passport and photo",
      },
    ],
  },
  {
    id: "synth001-4",
    label: "SYNTH_001 - Bank balance conversion",
    clientSequence: "I have all those. My bank balance has been above $15,000 USD for the past year actually. Do I need to convert it to THB?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
      {
        role: "client",
        message: "I'm American and currently in Bali. Can I apply from Indonesia?",
      },
      {
        role: "consultant",
        message:
          "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
      },
      {
        role: "client",
        message: "What documents do I need to prepare?",
      },
      {
        role: "consultant",
        message:
          "For remote workers applying for the DTV, you'll need:\n\n1. Valid passport with at least 6 months validity\n2. Bank statements showing 500,000 THB equivalent for the past 3 months\n3. Employment contract or letter from your employer confirming remote work arrangement\n4. Proof of income (pay slips from the last 3 months)\n5. Passport-sized photo\n6. Proof of address in your submission country",
      },
    ],
  },
  {
    id: "synth010-3",
    label: "SYNTH_010 - Location preference",
    clientSequence: "I was thinking Phuket. Want to be near the beach too!",
    chatHistory: [
      {
        role: "client",
        message: "Hey! Want to train Muay Thai in Thailand for 6 months. Heard about DTV visa.",
      },
      {
        role: "consultant",
        message: "Hi there! Yes, Muay Thai training qualifies for the DTV under the soft power/cultural activities category. This is a popular option! Where are you from and where would you like to apply?",
      },
      {
        role: "client",
        message: "I'm British. Currently traveling in Southeast Asia. Maybe apply from Cambodia?",
      },
      {
        role: "consultant",
        message: "Cambodia is possible, but for Muay Thai DTVs, we actually recommend Laos for the highest approval rates. The embassy there is very familiar with soft power applications. Would you consider applying from Vientiane instead?",
      },
      {
        role: "client",
        message: "Sure, Laos works. What gym should I enroll at?",
      },
      {
        role: "consultant",
        message: "We work with several approved gyms across Thailand. Popular options are in Bangkok, Phuket, and Chiang Mai. Do you have a preference for location? We can recommend gyms that provide proper enrollment documentation for the DTV.",
      },
    ],
  },
];

export const improveAiPresets: ImproveAiPreset[] = [
  {
    id: "synth001-2-improve",
    label: "SYNTH_001 - Indonesia eligibility + fee/timeline",
    clientSequence: "I'm American and currently in Bali. Can I apply from Indonesia?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
    ],
    consultantReply:
      "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
  },
  {
    id: "synth001-3-improve",
    label: "SYNTH_001 - Documents list",
    clientSequence: "What documents do I need to prepare?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
      {
        role: "client",
        message: "I'm American and currently in Bali. Can I apply from Indonesia?",
      },
      {
        role: "consultant",
        message:
          "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
      },
    ],
    consultantReply:
      "For remote workers applying for the DTV, you'll need:\n\n1. Valid passport with at least 6 months validity\n2. Bank statements showing 500,000 THB equivalent for the past 3 months\n3. Employment contract or letter from your employer confirming remote work arrangement\n4. Proof of income (pay slips from the last 3 months)\n5. Passport-sized photo\n6. Proof of address in your submission country",
  },
  {
    id: "synth005-1-improve",
    label: "SYNTH_005 - Address proof rejected",
    clientSequence:
      "Hi I uploaded my documents but got feedback saying address proof is not acceptable?",
    chatHistory: [],
    consultantReply:
      "Hello! Let me check your account. What email did you use to sign up?",
  },
  {
    id: "synth004-2-improve",
    label: "SYNTH_004 - Self-employed document requirements",
    clientSequence: "I'm currently in Malaysia. Can I apply here?",
    chatHistory: [
      {
        role: "client",
        message: "Hi, I'm a freelance graphic designer. Can I apply for DTV?",
      },
      {
        role: "consultant",
        message: "Hello! Yes, freelancers and self-employed individuals can apply for the DTV. May I know your nationality and where your business is registered?",
      },
      {
        role: "client",
        message: "I'm German. My business is registered in Germany. I have clients from various countries.",
      },
      {
        role: "consultant",
        message: "Great! For self-employed applicants, you'll need to demonstrate that your work is location-independent and you won't be working with Thai clients. Where do you plan to submit your application?",
      },
    ],
    consultantReply:
      "Yes, Malaysia is a good option! For self-employed applicants, you'll need:\n\n1. Business registration documents (translated to English if in German)\n2. Bank statements showing 500,000 THB equivalent for 3 months\n3. Client contracts or invoices from the past 3 months\n4. Proof of income showing payments from clients\n5. Passport and photo",
  },
  {
    id: "synth010-2-improve",
    label: "SYNTH_010 - Muay Thai training enrollment",
    clientSequence: "Sure, Laos works. What gym should I enroll at?",
    chatHistory: [
      {
        role: "client",
        message: "Hey! Want to train Muay Thai in Thailand for 6 months. Heard about DTV visa.",
      },
      {
        role: "consultant",
        message: "Hi there! Yes, Muay Thai training qualifies for the DTV under the soft power/cultural activities category. This is a popular option! Where are you from and where would you like to apply?",
      },
      {
        role: "client",
        message: "I'm British. Currently traveling in Southeast Asia. Maybe apply from Cambodia?",
      },
      {
        role: "consultant",
        message: "Cambodia is possible, but for Muay Thai DTVs, we actually recommend Laos for the highest approval rates. The embassy there is very familiar with soft power applications. Would you consider applying from Vientiane instead?",
      },
    ],
    consultantReply:
      "We work with several approved gyms across Thailand. Popular options are in Bangkok, Phuket, and Chiang Mai. Do you have a preference for location? We can recommend gyms that provide proper enrollment documentation for the DTV.",
  },
  {
    id: "synth012-2-improve",
    label: "SYNTH_012 - Embassy additional documents",
    clientSequence: "Oh no, what do they need?",
    chatHistory: [
      {
        role: "consultant",
        message: "Hi! We received a request from the embassy regarding your application. They're asking for additional documents.",
      },
    ],
    consultantReply:
      "They're requesting:\n\n1. Updated bank statement (must be dated within 7 days)\n2. Entry/exit records from your country for the past year\n3. Additional proof of client payments matching your invoices",
  },
  {
    id: "synth001-5-improve",
    label: "SYNTH_001 - Application start process",
    clientSequence: "Perfect. How do I get started?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
      {
        role: "client",
        message: "I'm American and currently in Bali. Can I apply from Indonesia?",
      },
      {
        role: "consultant",
        message:
          "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
      },
      {
        role: "client",
        message: "What documents do I need to prepare?",
      },
      {
        role: "consultant",
        message:
          "For remote workers applying for the DTV, you'll need:\n\n1. Valid passport with at least 6 months validity\n2. Bank statements showing 500,000 THB equivalent for the past 3 months\n3. Employment contract or letter from your employer confirming remote work arrangement\n4. Proof of income (pay slips from the last 3 months)\n5. Passport-sized photo\n6. Proof of address in your submission country",
      },
      {
        role: "client",
        message: "I have all those. My bank balance has been above $15,000 USD for the past year actually. Do I need to convert it to THB?",
      },
      {
        role: "consultant",
        message:
          "No need to convert! As long as your bank statements show the equivalent of 500,000 THB (approximately $14,000-15,000 USD), that's acceptable. Please make sure the statements clearly show your name and the balance over the 3-month period.",
      },
    ],
    consultantReply:
      "Please download our app and create an account. You can upload all your documents there, and our legal team will review them within 1-2 business days. Once approved, we'll guide you through the payment and submission process.\n\nApp link: [APP_LINK]",
  },
  {
    id: "synth010-3-improve",
    label: "SYNTH_010 - Gym location and documentation",
    clientSequence: "I was thinking Phuket. Want to be near the beach too!",
    chatHistory: [
      {
        role: "client",
        message: "Hey! Want to train Muay Thai in Thailand for 6 months. Heard about DTV visa.",
      },
      {
        role: "consultant",
        message: "Hi there! Yes, Muay Thai training qualifies for the DTV under the soft power/cultural activities category. This is a popular option! Where are you from and where would you like to apply?",
      },
      {
        role: "client",
        message: "I'm British. Currently traveling in Southeast Asia. Maybe apply from Cambodia?",
      },
      {
        role: "consultant",
        message: "Cambodia is possible, but for Muay Thai DTVs, we actually recommend Laos for the highest approval rates. The embassy there is very familiar with soft power applications. Would you consider applying from Vientiane instead?",
      },
      {
        role: "client",
        message: "Sure, Laos works. What gym should I enroll at?",
      },
      {
        role: "consultant",
        message: "We work with several approved gyms across Thailand. Popular options are in Bangkok, Phuket, and Chiang Mai. Do you have a preference for location? We can recommend gyms that provide proper enrollment documentation for the DTV.",
      },
    ],
    consultantReply:
      "Great choice! We work with several reputable gyms in Phuket. They can provide:\n\n1. Official enrollment letter\n2. Training schedule (minimum 6 months)\n3. Payment receipts\n4. Gym registration documents\n\nWould you like us to help arrange enrollment?",
  },
  {
    id: "synth005-2-improve",
    label: "SYNTH_005 - Address proof alternatives",
    clientSequence: "I'm staying with a friend. I don't have utilities in my name here.",
    chatHistory: [
      {
        role: "client",
        message: "Hi I uploaded my documents but got feedback saying address proof is not acceptable?",
      },
      {
        role: "consultant",
        message: "Hello! Let me check your account. What email did you use to sign up?",
      },
      {
        role: "client",
        message: "[EMAIL]",
      },
      {
        role: "consultant",
        message: "I found your account. I see you uploaded a screenshot of your bank app as address proof. Unfortunately, this isn't accepted. We need an official document showing your name and address in the submission country.",
      },
      {
        role: "client",
        message: "What counts as acceptable?",
      },
      {
        role: "consultant",
        message: "Acceptable address proof includes:\n\n1. Utilities bill (electricity, gas, water) from the last 3 months\n2. Government letter (tax document, council letter)\n3. Rental agreement\n4. Driver's license with current address\n5. Bank statement (physical letter, not app screenshot)\n\nThe document must clearly show your name and address.",
      },
    ],
    consultantReply:
      "In that case, do you have any of these:\n\n1. A valid driver's license from your home country with your address?\n2. A recent government letter sent to you?\n3. Any bank statements mailed to your address?",
  },
  {
    id: "synth001-6-improve",
    label: "SYNTH_001 - Indonesia stay requirements",
    clientSequence: "Done! All uploaded. How long do I need to stay in Indonesia while waiting?",
    chatHistory: [
      {
        role: "client",
        message:
          "Hello, I'm interested in the DTV visa for Thailand. I work remotely as a software developer for a US company.",
      },
      {
        role: "consultant",
        message:
          "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you'd like to apply from?",
      },
      {
        role: "client",
        message: "I'm American and currently in Bali. Can I apply from Indonesia?",
      },
      {
        role: "consultant",
        message:
          "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
      },
      {
        role: "client",
        message: "What documents do I need to prepare?",
      },
      {
        role: "consultant",
        message:
          "For remote workers applying for the DTV, you'll need:\n\n1. Valid passport with at least 6 months validity\n2. Bank statements showing 500,000 THB equivalent for the past 3 months\n3. Employment contract or letter from your employer confirming remote work arrangement\n4. Proof of income (pay slips from the last 3 months)\n5. Passport-sized photo\n6. Proof of address in your submission country",
      },
      {
        role: "client",
        message: "Perfect. How do I get started?",
      },
      {
        role: "consultant",
        message:
          "Please download our app and create an account. You can upload all your documents there, and our legal team will review them within 1-2 business days. Once approved, we'll guide you through the payment and submission process.\n\nApp link: [APP_LINK]",
      },
      {
        role: "client",
        message: "Downloaded and signed up. Email is [EMAIL]. Uploading docs now.",
      },
      {
        role: "consultant",
        message:
          "Great! I can see your account. Please upload all documents and we'll review them shortly. One important reminder: please make sure to maintain the 500,000 THB balance in your account until your visa is approved, as the embassy may request an updated statement.",
      },
    ],
    consultantReply:
      "According to official regulations, you should remain in Indonesia until the visa is approved. If you leave before your visa is issued, we won't be able to extend our money-back guarantee. Processing typically takes about 10 business days in Indonesia.",
  },
];
