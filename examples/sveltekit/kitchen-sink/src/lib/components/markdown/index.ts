import DateTime from './DateTime.svelte';
import BlockQuote from './BlockQuote.svelte';
import PullQuote from './PullQuote.svelte';
import NewsletterSignup from './NewsletterSignup.svelte';

export const customComponents: Record<string, any> = {
  DateTime,
  BlockQuote,
  pullQuote: PullQuote,
  'pull-quote': PullQuote,
  NewsletterSignup,
};
