import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <p className="text-lg text-foreground">Travel Booking</p>
          <Button>
            <Link href="/search">Start searching</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
