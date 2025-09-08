import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Globe, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SampleAccount {
  name: string;
  restaurant: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  status: 'verified' | 'pending';
  description: string;
}

const sampleAccounts: SampleAccount[] = [
  {
    name: "Joe Martinez",
    restaurant: "Joe's Pizza Palace",
    email: "owner@joes-pizza.com",
    phone: "+1-555-0101",
    address: "123 Main St, New York, NY 10001",
    website: "https://joes-pizza.com",
    status: "verified",
    description: "Family-owned Italian pizzeria with authentic recipes since 1985"
  },
  {
    name: "Maria Rodriguez", 
    restaurant: "Mama's Kitchen",
    email: "manager@mamas-kitchen.com",
    phone: "+1-555-0102",
    address: "456 Oak Ave, Los Angeles, CA 90210",
    website: "https://mamas-kitchen.com",
    status: "verified",
    description: "Traditional Mexican cuisine with fresh, locally sourced ingredients"
  },
  {
    name: "David Chen",
    restaurant: "The Golden Spoon",
    email: "chef@the-golden-spoon.com", 
    phone: "+1-555-0103",
    address: "789 Pine St, Chicago, IL 60601",
    website: "https://golden-spoon.com",
    status: "verified",
    description: "Modern Asian fusion restaurant with innovative culinary experiences"
  }
];

export const SampleBusinessAccounts: React.FC = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sample Business Accounts
          </CardTitle>
          <CardDescription>
            Use these pre-created business accounts to test the platform. All accounts use password: <code className="bg-muted px-1 rounded">password123</code>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {sampleAccounts.map((account, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{account.restaurant}</CardTitle>
                  <CardDescription>{account.name}</CardDescription>
                </div>
                <Badge 
                  variant={account.status === 'verified' ? 'default' : 'secondary'}
                  className={account.status === 'verified' ? 'bg-green-100 text-green-800' : ''}
                >
                  {account.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{account.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{account.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(account.email, 'Email')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{account.phone}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(account.phone, 'Phone')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="flex-1">{account.address}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={account.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-primary hover:underline"
                  >
                    {account.website}
                  </a>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Password:</strong> password123
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy any email above and use it to sign in with password: <code className="bg-muted px-1 rounded">password123</code></li>
            <li>Test the business dashboard and referral tracking features</li>
            <li>Create food requests and recommendations to see the full flow</li>
            <li>Test the admin features if you have admin access</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};