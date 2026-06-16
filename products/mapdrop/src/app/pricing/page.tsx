import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For personal projects and quick maps.',
    features: ['5 maps', '1,000 rows per map', 'Public maps only', '30-day map expiry', 'Basic geocoding'],
    cta: 'Get Started',
    href: '/mapdrop/dashboard',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professionals who need more power.',
    features: [
      'Unlimited maps',
      '50,000 rows per map',
      'Private maps',
      'Password sharing',
      'Priority geocoding',
      'Embeddable maps',
      'No expiry',
    ],
    cta: 'Start Pro Trial',
    href: '/mapdrop/dashboard',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$79',
    period: '/month',
    description: 'For teams with advanced needs.',
    features: [
      'Everything in Pro',
      'Team workspace',
      'Role-based access',
      'Territory tools',
      'Route optimization',
      'PMTiles export',
      'Priority support',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@mapdrop.io',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-gray-600">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-gray-900 text-white ring-4 ring-blue-500 ring-offset-2'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                </span>
                <span className={`ml-1 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`mt-2 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-sm ${plan.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block w-full text-center py-3 px-4 rounded-lg font-semibold transition ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
