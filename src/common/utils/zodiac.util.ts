export class ZodiacUtil {
  static getZodiacSign(birthday: string): string {
    const date = new Date(birthday);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
      return "Aquarius";
    } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
      return "Pisces";
    } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
      return "Aries";
    } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
      return "Taurus";
    } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
      return "Gemini";
    } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
      return "Cancer";
    } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
      return "Leo";
    } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
      return "Virgo";
    } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
      return "Libra";
    } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
      return "Scorpio";
    } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
      return "Sagittarius";
    } else {
      return "Capricorn";
    }
  }

  static getHoroscope(zodiacSign: string): string {
    const horoscopes = {
      Aries:
        "Courageous, energetic, willful, commanding, leading. Often leads when following would be best course of action.",
      Taurus:
        "Pleasure seeking, loves control, dependable, grounded, provokes slowly, and highly sensual in nature.",
      Gemini:
        "Cerebral, chatty, loves learning and education, charming, and adventurous.",
      Cancer: "Emotional, group oriented, seeks security, family.",
      Leo: "Generous, organized, protective, beautiful.",
      Virgo: "Particular, logical, practical, sense of duty, critical.",
      Libra: "Balanced, seeks beauty, sense of justice.",
      Scorpio: "Passionate, exacting, loves extremes, combative, reflective.",
      Sagittarius: "Happy, absent minded, creative, adventurous.",
      Capricorn: "Timeless, driven, calculating, ambitious.",
      Aquarius:
        "Forward thinking, communicative, people oriented, stubborn, generous, and dedicated.",
      Pisces: "Likeable, energetic, passionate, sensitive.",
    };

    return horoscopes[zodiacSign] || "A mysterious and unique personality.";
  }

  static getDailyHoroscope(zodiacSign: string): string {
    const dailyHoroscopes = {
      Aries:
        "Today is a day for action! Your energy is high, making it perfect for starting new projects.",
      Taurus:
        "Focus on financial matters today. Stability and security are your keywords.",
      Gemini:
        "Communication flows easily today. Great day for meetings and social interactions.",
      Cancer:
        "Emotional connections are highlighted. Spend time with loved ones.",
      Leo: "Your creativity shines! Express yourself through art or leadership.",
      Virgo:
        "Attention to detail will pay off. Organize and plan for the week ahead.",
      Libra:
        "Balance is key today. Seek harmony in relationships and decisions.",
      Scorpio:
        "Your intuition is strong. Trust your gut feelings in important matters.",
      Sagittarius: "Adventure calls! Explore new ideas or places today.",
      Capricorn:
        "Hard work brings rewards. Stay focused on your long-term goals.",
      Aquarius: "Innovation and new ideas are favored. Think outside the box.",
      Pisces:
        "Compassion and understanding will guide you to help others today.",
    };

    return (
      dailyHoroscopes[zodiacSign] || "A day full of possibilities awaits you!"
    );
  }

  static getWeeklyHoroscope(zodiacSign: string): string {
    const weeklyHoroscopes = {
      Aries:
        "This week brings opportunities for leadership. Take charge but listen to others.",
      Taurus:
        "Financial growth is possible. Be patient and make careful decisions.",
      Gemini:
        "Social connections flourish. Network and communicate your ideas.",
      Cancer:
        "Family and home matters need attention. Create a comfortable space.",
      Leo: "Creative projects succeed. Your charisma attracts helpful people.",
      Virgo: "Organization leads to success. Pay attention to health matters.",
      Libra: "Relationships deepen. Seek balance in partnerships.",
      Scorpio:
        "Transformation is possible. Embrace change and personal growth.",
      Sagittarius:
        "Learning opportunities abound. Travel or study expands horizons.",
      Capricorn: "Career advancements possible. Hard work gets recognition.",
      Aquarius:
        "Innovation and teamwork bring success. Collaborate with others.",
      Pisces:
        "Spiritual growth highlighted. Trust your intuition in decisions.",
    };

    return (
      weeklyHoroscopes[zodiacSign] ||
      "A week of growth and opportunities awaits!"
    );
  }

  static getCompatibility(zodiacSign: string): string[] {
    const compatibility: { [key: string]: string[] } = {
      Aries: ["Leo", "Sagittarius", "Gemini", "Aquarius"],
      Taurus: ["Virgo", "Capricorn", "Cancer", "Pisces"],
      Gemini: ["Libra", "Aquarius", "Aries", "Leo"],
      Cancer: ["Scorpio", "Pisces", "Taurus", "Virgo"],
      Leo: ["Aries", "Sagittarius", "Gemini", "Libra"],
      Virgo: ["Taurus", "Capricorn", "Cancer", "Scorpio"],
      Libra: ["Gemini", "Aquarius", "Leo", "Sagittarius"],
      Scorpio: ["Cancer", "Pisces", "Virgo", "Capricorn"],
      Sagittarius: ["Aries", "Leo", "Libra", "Aquarius"],
      Capricorn: ["Taurus", "Virgo", "Scorpio", "Pisces"],
      Aquarius: ["Gemini", "Libra", "Aries", "Sagittarius"],
      Pisces: ["Cancer", "Scorpio", "Taurus", "Capricorn"],
    };

    return (
      compatibility[zodiacSign] || [
        "All signs have potential for great connections!",
      ]
    );
  }

  static calculateAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  static getZodiacElement(zodiacSign: string): string {
    const elements: { [key: string]: string } = {
      Aries: "Fire",
      Leo: "Fire",
      Sagittarius: "Fire",
      Taurus: "Earth",
      Virgo: "Earth",
      Capricorn: "Earth",
      Gemini: "Air",
      Libra: "Air",
      Aquarius: "Air",
      Cancer: "Water",
      Scorpio: "Water",
      Pisces: "Water",
    };

    return elements[zodiacSign] || "Unknown";
  }
}
