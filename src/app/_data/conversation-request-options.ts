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
];
