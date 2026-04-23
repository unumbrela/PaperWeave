"use client";

import { useEffect, useState } from "react";
import { DecoderText } from "./DecoderText";
import { DisplacementSphere } from "./DisplacementSphere";

const NAME = "Hamish Williams · Demo Port";
const ROLE = "Designer + Developer";
const DISCIPLINES = [
  "Designer",
  "Developer",
  "Animator",
  "Illustrator",
  "Modder",
];

export function Intro() {
  const [disciplineIndex, setDisciplineIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setDisciplineIndex((i) => (i + 1) % DISCIPLINES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const current = DISCIPLINES[disciplineIndex];

  return (
    <section className="hamish-intro" aria-labelledby="hamish-intro-title">
      <DisplacementSphere />
      <header className="hamish-intro-text">
        <h1 className="hamish-intro-name" id="hamish-intro-title">
          <DecoderText text={NAME} delay={500} />
        </h1>
        <h2 className="hamish-intro-title">
          <span className="hamish-intro-row">
            <span className="hamish-intro-word">{ROLE}</span>
            <span className="hamish-intro-line" />
          </span>
          <span className="hamish-intro-row">
            <span className="hamish-intro-word hamish-intro-word-plus" key={current}>
              {current}
            </span>
          </span>
        </h2>
      </header>

      <a
        href="#hamish-article-anchor"
        className="hamish-intro-scroll"
        aria-label="Scroll to article"
      >
        <svg aria-hidden width="43" height="15" viewBox="0 0 43 15">
          <path
            d="M1 1l20.5 12L42 1"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
          />
        </svg>
      </a>
    </section>
  );
}
