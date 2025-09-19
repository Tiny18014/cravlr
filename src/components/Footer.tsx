import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">FoodRequest</h3>
            <p className="text-sm text-muted-foreground">
              Connecting food lovers with local experts for personalized restaurant recommendations.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="font-medium">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/browse-requests" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Requests
                </Link>
              </li>
              <li>
                <Link to="/business/claim" className="text-muted-foreground hover:text-foreground transition-colors">
                  For Businesses
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-medium">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link to="/sample-accounts" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sample Accounts
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-medium">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FoodRequest. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-red-500" /> for food lovers
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;