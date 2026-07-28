import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';

export type BookingConfirmationEmailProps = {
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  currency: string;
  confirmationUrl: string;
};

export function BookingConfirmationEmail({
  guestName,
  listingTitle,
  checkIn,
  checkOut,
  nights,
  totalPrice,
  currency,
  confirmationUrl,
}: BookingConfirmationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your booking at {listingTitle} is confirmed</Preview>
      <Body>
        <Container>
          <Heading>Booking confirmed</Heading>
          {/* Each line below is one template literal rather than adjacent
              JSX expressions — React's SSR renderer inserts `<!-- -->`
              between separate sibling expressions to guard hydration, which
              this email never does, and which would otherwise split e.g.
              "5 nights" into text a consumer can't reliably search for. */}
          <Text>{`Hi ${guestName}, your reservation is confirmed.`}</Text>
          <Section>
            <Text>{listingTitle}</Text>
            <Text>{`${checkIn} – ${checkOut} · ${nights} night${nights === 1 ? '' : 's'}`}</Text>
            <Text>{`${totalPrice} ${currency} total`}</Text>
          </Section>
          <Hr />
          <Text>
            <Link href={confirmationUrl}>View your booking</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
