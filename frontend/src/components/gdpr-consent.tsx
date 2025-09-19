"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface GDPRConsentProps {
  onAccept: () => void;
}

const GDPRConsent: React.FC<GDPRConsentProps> = ({ onAccept }) => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 animate-fadeIn">
      <Card className="shadow-lg border border-gray-200">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Disclaimer – AI-Based Personality Assessment for HR Use (GDPR-Compliant)</h1>
          </div>

          <div className="prose max-w-none text-gray-700 space-y-4">
            <p>
              This personality assessment has been generated using an AI system that processes speech content (including translated text), vocal features and other acoustic signals, and facial expressions. The analysis is powered by third-party technologies, including Google language libraries and Gemini, and is intended to provide supplementary behavioural insights in a corporate Human Resources context.
            </p>
            <p>
              The results of this assessment are generated through automated processing and machine learning models. They are not intended to replace human judgment or serve as the sole basis for recruitment, promotion, or other employment-related decisions. The insights offered should be interpreted in conjunction with other assessment tools.
            </p>
            <h2 className="text-xl font-semibold text-gray-900">Data Protection and GDPR Compliance</h2>
            <p>
              All personal data processed in the course of generating this assessment is handled in compliance with the General Data Protection Regulation (Regulation (EU) 2016/679). The processing is based on the lawful basis of explicit consent and is limited to the specific purpose of personality and communication style assessment for HR evaluation.
            </p>
            <p>
              Data subjects have the right to access, rectify, or erase their personal data, restrict or object to processing, and to withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal. No personal data is shared with third parties without proper safeguards and agreements in place.
            </p>
            <p>
              Trajectorie takes appropriate technical and organisational measures to ensure data security, integrity, and confidentiality. For any queries or to exercise your data protection rights, please contact our Data Protection Officer at solutions@trajectorie.com.
            </p>
            <h2 className="text-xl font-semibold text-gray-900">Consent Declaration</h2>
            <p>
              I, the undersigned, hereby give my explicit and informed consent for Trajectorie to collect, process, and analyse my speech, voice, and facial data for the sole purpose of generating an AI-based personality assessment in connection with HR-related evaluations. I understand that the assessment results may be reviewed by authorised personnel for recruitment, team-building, or training purposes, and that they will not be used as the sole basis for any employment decision.
            </p>
            <p>
              I acknowledge that I have read and understood the above disclaimer, including my rights under the GDPR. I understand that I may withdraw my consent at any time by contacting Trajectorie (solutions@trajectorie.com), and that doing so will not affect any prior lawful processing.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-md border">
            <Checkbox id="gdpr-accept" checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
            <label htmlFor="gdpr-accept" className="text-sm text-gray-800 leading-relaxed cursor-pointer">
              I have read the agreement and accept
            </label>
          </div>

          <div className="flex justify-end">
            <Button disabled={!checked} onClick={onAccept} className="px-6">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GDPRConsent;
