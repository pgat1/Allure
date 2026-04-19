import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#ff4d82" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <Text style={s.logo}>Allure</Text>
        <Text style={s.lastUpdated}>Last Updated: April 1, 2025</Text>

        <Section title="1. Acceptance of Terms">
          {`By downloading, accessing, or using Allure ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. These Terms constitute a legally binding agreement between you and Allure, Inc. ("Company," "we," "us," or "our").`}
        </Section>

        <Section title="2. Eligibility">
          {`You must be at least 18 years of age to use Allure. By using the App, you represent and warrant that you are 18 years of age or older and have the legal capacity to enter into a binding agreement. We reserve the right to terminate your account if we discover that you are under 18.\n\nAllure is intended for personal, non-commercial use only. By creating an account, you confirm that you are a real person and are not using automated means to access the App.`}
        </Section>

        <Section title="3. User Accounts">
          {`To use Allure, you must create an account. You agree to:\n\n• Provide accurate, current, and complete information during registration\n• Maintain the security of your password and account credentials\n• Promptly notify us of any unauthorized use of your account\n• Accept responsibility for all activity that occurs under your account\n\nWe reserve the right to suspend or terminate accounts that violate these Terms or that we believe, in our sole discretion, are being used for fraudulent or harmful purposes.`}
        </Section>

        <Section title="4. User Content">
          {`You retain ownership of any content you submit to Allure, including photos, profile information, and messages ("User Content"). By submitting User Content, you grant Allure a non-exclusive, royalty-free, worldwide, sublicensable license to use, reproduce, modify, adapt, publish, and display such content solely for the purpose of operating and improving the App.\n\nYou represent and warrant that your User Content does not violate any third-party rights, including intellectual property rights and privacy rights, and that it complies with these Terms and all applicable laws.`}
        </Section>

        <Section title="5. AI Scoring & Features">
          {`Allure uses artificial intelligence to provide features including but not limited to attractiveness scoring, profile optimization suggestions, and the Wingman AI messaging assistant. You acknowledge and agree that:\n\n• AI-generated scores and suggestions are algorithmic estimates and do not constitute professional opinions\n• Scores may change over time as our models are updated\n• AI-generated content, including Wingman suggestions, are provided for entertainment and convenience only\n• You are solely responsible for any messages you choose to send, regardless of whether they were suggested by the AI\n• We do not guarantee the accuracy, completeness, or usefulness of any AI-generated output`}
        </Section>

        <Section title="6. Subscriptions & Payments">
          {`Allure offers subscription plans including Allure+ tiers (Radiant, Luxe, and Celestial). By purchasing a subscription:\n\n• You authorize us to charge your payment method on a recurring basis\n• Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date\n• You may cancel your subscription at any time through your device's app store settings\n• Refunds are subject to the refund policy of the applicable app store (Apple App Store or Google Play)\n• We reserve the right to change subscription pricing with reasonable advance notice\n\nAll purchases are final except where required by applicable law.`}
        </Section>

        <Section title="7. Prohibited Conduct">
          {`You agree not to:\n\n• Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or obscene\n• Impersonate any person or entity or misrepresent your affiliation with any person or entity\n• Use the App to solicit money from other users\n• Post or transmit unsolicited commercial messages (spam)\n• Attempt to gain unauthorized access to other user accounts or our systems\n• Use automated scripts, bots, or other software to access or interact with the App\n• Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the App\n• Post photos of other people without their consent\n• Promote or facilitate violence, discrimination, or illegal activity`}
        </Section>

        <Section title="8. Safety">
          {`Your safety is important to us. However, Allure does not conduct background checks on users. We encourage you to:\n\n• Never share personal financial information with other users\n• Meet in public places for first meetings\n• Tell a friend or family member about your plans\n• Trust your instincts — if something feels wrong, it probably is\n• Report any suspicious behavior using our in-app reporting tools\n\nAllure is not responsible for the conduct of any user on or off the App. You assume all risk associated with meeting people through the App.`}
        </Section>

        <Section title="9. Disclaimers">
          {`THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, ALLURE DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.\n\nAllure does not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We do not guarantee that you will find a match, relationship, or any particular outcome from using the App.`}
        </Section>

        <Section title="10. Limitation of Liability">
          {`TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ALLURE, INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE APP.\n\nIN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100 USD.`}
        </Section>

        <Section title="11. Indemnification">
          {`You agree to indemnify, defend, and hold harmless Allure, Inc. and its officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to:\n\n• Your use of the App\n• Your violation of these Terms\n• Your User Content\n• Your interaction with any other user`}
        </Section>

        <Section title="12. Privacy">
          {`Your use of Allure is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to the collection, use, and sharing of your information as described in our Privacy Policy.\n\nWe collect location data, device information, usage data, and the content you provide to us. We use this data to provide, personalize, and improve the App and to facilitate connections between users.`}
        </Section>

        <Section title="13. Third-Party Services">
          {`Allure integrates with third-party services including Supabase (database and authentication), Anthropic (AI features), and app store platforms. Your use of these third-party services is subject to their respective terms and privacy policies. Allure is not responsible for the practices of any third-party services.`}
        </Section>

        <Section title="14. Intellectual Property">
          {`All content, features, and functionality of the App — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of Allure, Inc. or its licensors and are protected by copyright, trademark, and other intellectual property laws.\n\nYou may not copy, modify, distribute, sell, or lease any part of our App or its content without our express written permission.`}
        </Section>

        <Section title="15. Termination">
          {`We reserve the right to suspend or terminate your account and access to the App at any time, for any reason, with or without notice. Reasons for termination may include violation of these Terms, requests by law enforcement, or extended periods of inactivity.\n\nYou may terminate your account at any time by contacting us. Upon termination, your right to use the App ceases immediately. Provisions of these Terms that by their nature should survive termination shall survive.`}
        </Section>

        <Section title="16. Governing Law">
          {`These Terms shall be governed by and construed in accordance with the laws of the State of Tennessee, United States, without regard to its conflict of law provisions. You agree to submit to the personal jurisdiction of the courts located in Tennessee for the resolution of any disputes.`}
        </Section>

        <Section title="17. Dispute Resolution">
          {`Any dispute arising from or relating to these Terms or the App shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.\n\nYou agree to waive any right to a class action lawsuit or class-wide arbitration. Claims must be brought in the parties' individual capacities, not as plaintiffs or class members in any purported class or representative proceeding.`}
        </Section>

        <Section title="18. Changes to Terms">
          {`We reserve the right to modify these Terms at any time. When we make changes, we will update the "Last Updated" date at the top of this page. Continued use of the App after any changes constitutes your acceptance of the new Terms. If you do not agree to the updated Terms, you must stop using the App.`}
        </Section>

        <Section title="19. Contact Us">
          {`If you have any questions, concerns, or feedback about these Terms of Service, please contact us:\n\nAllure, Inc.\nEmail: support@allureapp.com\n\nWe will do our best to respond to your inquiry within a reasonable timeframe.`}
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionBody}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#08000d' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  backBtn:      { width: 40, alignItems: 'flex-start' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  scroll:       { paddingHorizontal: 24, paddingTop: 28 },
  logo:         { fontSize: 36, fontWeight: '200', fontStyle: 'italic', color: '#ff4d82', letterSpacing: 6, textAlign: 'center', marginBottom: 6 },
  lastUpdated:  { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 32, letterSpacing: 0.5 },
  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#ff4d82', marginBottom: 10, letterSpacing: 0.2 },
  sectionBody:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 22, letterSpacing: 0.1 },
});
