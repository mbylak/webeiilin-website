# webeillin landing page

Landing page z formularzem leadowym podlaczonym do Brevo przez endpoint serwerowy.

## Co jest gotowe

- Formularz z walidacja email i honeypotem.
- Frontend wysylajacy lead na `"/api/lead"`.
- Serverless endpoint `api/lead.js`:
  - dodaje/aktualizuje kontakt w Brevo (z deduplikacja),
  - dopisuje kontakt do wskazanej listy,
  - opcjonalnie wysyla thank-you email przez Brevo SMTP API.
- Przekazywanie UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`).

## Wymagane zmienne srodowiskowe

Skopiuj `.env.example` i uzupelnij wartosci:

- `BREVO_API_KEY` - API key z Brevo (v3).
- `BREVO_LIST_ID` - ID listy odbiorcow w Brevo.
- `BREVO_SENDER_EMAIL` - zweryfikowany nadawca w Brevo (opcjonalne, wymagane do autorespondera).
- `BREVO_SENDER_NAME` - nazwa nadawcy (opcjonalne).
- `BREVO_THANK_YOU_SUBJECT` - temat autorespondera (opcjonalne).

## Konfiguracja Brevo krok po kroku

1. W Brevo utworz liste kontaktow dla dropu i skopiuj jej `List ID`.
2. Wygeneruj `API key` (SMTP/API -> API Keys).
3. Zweryfikuj domene nadawcza (SPF, DKIM, najlepiej tez DMARC).
4. Ustaw zmienne srodowiskowe w hostingu (np. Vercel Project Settings -> Environment Variables).
5. Wdroz projekt.
6. Wyslij testowy zapis przez formularz i sprawdz:
   - czy kontakt trafia do listy,
   - czy przychodzi thank-you email (jesli ustawiono `BREVO_SENDER_EMAIL`).

## Jak to dziala

Frontend (`nowykod.html` + `app.js`) wysyla `POST` na `"/api/lead"` z payloadem:

```json
{
  "email": "user@example.com",
  "website": "",
  "source": "landing-page",
  "list": "webeillin-drop-list",
  "createdAt": "2026-03-28T19:00:00.000Z",
  "locale": "pl-PL",
  "localeUi": "pl",
  "referrer": "",
  "utm_source": "instagram",
  "utm_medium": "social",
  "utm_campaign": "drop_1",
  "utm_content": "",
  "utm_term": ""
}
```

Endpoint:

- odrzuca boty na podstawie `website` (honeypot),
- waliduje email,
- wywoluje Brevo Contacts API (`/v3/contacts`) z `updateEnabled: true`,
- opcjonalnie wywoluje Brevo SMTP API (`/v3/smtp/email`) dla autorespondera.

## Uwagi produkcyjne

- Nie wystawiaj `BREVO_API_KEY` po stronie frontendu.
- Na produkcji trzymaj endpoint tylko po HTTPS.
- Przed kampania zrob testy na realnych skrzynkach: Gmail + Outlook.
