import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { Building2, CheckCircle, XCircle, Clock, Mail, Phone, Globe, MapPin } from 'lucide-react';

interface BusinessClaim {
  id: string;
  restaurant_name: string;
  place_id?: string;
  status: string;
  created_at: string;
  verified_at?: string;
  verification_notes?: string;
  user_id: string;
}

export default function AdminBusinessClaims() {
  const { fetchBusinessClaims, updateClaimStatus, loading } = useBusinessClaims();
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<BusinessClaim | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    const data = await fetchBusinessClaims();
    setClaims(data);
  };

  const handleStatusUpdate = async (claimId: string, status: 'verified' | 'rejected') => {
    setActionLoading(claimId);
    const success = await updateClaimStatus(claimId, status, verificationNotes);
    if (success) {
      await loadClaims();
      setSelectedClaim(null);
      setVerificationNotes('');
    }
    setActionLoading(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    }
  };

  const pendingClaims = claims.filter(claim => claim.status === 'pending');
  const reviewedClaims = claims.filter(claim => claim.status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Business Claims Management</h1>
            <p className="text-muted-foreground">Review and approve restaurant ownership claims</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl">{pendingClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified</CardDescription>
              <CardTitle className="text-2xl">
                {claims.filter(c => c.status === 'verified').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl">
                {claims.filter(c => c.status === 'rejected').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Claims */}
        {pendingClaims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Claims</CardTitle>
              <CardDescription>Claims awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingClaims.map((claim) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{claim.restaurant_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(claim.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(claim.status)}>
                        Pending Review
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 mb-4">
                      {claim.place_id && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Google Place ID: {claim.place_id}</span>
                        </div>
                      )}
                    </div>

                    {selectedClaim?.id === claim.id ? (
                      <div className="space-y-4 bg-secondary/20 p-4 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="notes">Verification Notes (optional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Add any notes about this verification..."
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleStatusUpdate(claim.id, 'verified')}
                            disabled={actionLoading === claim.id}
                          >
                            {actionLoading === claim.id ? 'Verifying...' : 'Verify'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleStatusUpdate(claim.id, 'rejected')}
                            disabled={actionLoading === claim.id}
                          >
                            {actionLoading === claim.id ? 'Rejecting...' : 'Reject'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(null);
                              setVerificationNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        Review Claim
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviewed Claims */}
        {reviewedClaims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviewed Claims</CardTitle>
              <CardDescription>Previously reviewed claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviewedClaims.map((claim) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{claim.restaurant_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(claim.created_at).toLocaleDateString()}
                          {claim.verified_at && (
                            <> • Reviewed {new Date(claim.verified_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(claim.status)}
                        <Badge className={getStatusColor(claim.status)}>
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    {claim.verification_notes && (
                      <div className="mt-3 p-3 bg-secondary/30 rounded text-sm">
                        <strong>Notes:</strong> {claim.verification_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {claims.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No business claims found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}