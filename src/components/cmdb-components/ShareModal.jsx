import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Share2,
  Copy,
  Check,
  Link,
  Eye,
  Trash2,
  Lock,
  Calendar,
  Users,
  ExternalLink
} from 'lucide-react';
import {
  generateShareLink,
  getWorkspaceShareLinks,
  deleteShareLink,
} from '@/services/api';

const EXPIRATION_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: '1h', label: '1 Hour' },
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export default function ShareModal({ show, workspaceId, onClose }) {
  const [activeTab, setActiveTab] = useState('create');
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [expiration, setExpiration] = useState('7d');
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState(null);

  // Share links list
  const [shareLinks, setShareLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  // Load existing share links
  const loadShareLinks = async () => {
    if (!workspaceId) return;

    setLoadingLinks(true);
    try {
      const links = await getWorkspaceShareLinks(workspaceId);
      setShareLinks(links);
    } catch (error) {
      console.error('Error loading share links:', error);
      toast.error('Failed to load share links');
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (show && workspaceId) {
      loadShareLinks();
    }
  }, [show, workspaceId]);

  const handleGenerate = async () => {
    if (!workspaceId) {
      toast.error('Workspace ID is required');
      return;
    }

    setLoading(true);
    try {
      const result = await generateShareLink({
        workspace_id: workspaceId,
        expiration,
        password: password || undefined,
      });

      setGeneratedLink(result);
      setActiveTab('links');
      setPassword('');
      await loadShareLinks();

      toast.success('Share link generated successfully!');
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error(error.error || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this share link?')) {
      return;
    }

    try {
      await deleteShareLink(id);
      await loadShareLinks();
      toast.success('Share link deleted');
    } catch (error) {
      console.error('Error deleting share link:', error);
      toast.error('Failed to delete share link');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getExpirationBadge = (expiresAt) => {
    if (!expiresAt) {
      return <Badge variant="secondary">Never</Badge>;
    }

    const now = new Date();
    const expiry = new Date(expiresAt);

    if (expiry < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 1) {
      return <Badge variant="destructive">Expires soon</Badge>;
    } else if (daysLeft <= 7) {
      return <Badge variant="outline">Expires in {daysLeft} days</Badge>;
    }

    return <Badge variant="secondary">Active</Badge>;
  };

  // Helper function to construct share URL
  const getShareUrl = (token) => {
    return `${window.location.origin}/cmdb/shared/${token}`;
  };

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Workspace
          </DialogTitle>
          <DialogDescription>
            Generate share links to allow others to view this workspace without login
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="links">
              Existing Links ({shareLinks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration</Label>
              <Select value={expiration} onValueChange={setExpiration}>
                <SelectTrigger id="expiration">
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave empty for public access"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If set, users will need to enter this password to view the shared workspace
              </p>
            </div>

            {generatedLink && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Share Link Generated!</Label>
                  <Badge variant="default" className="bg-green-500">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={getShareUrl(generatedLink.token)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(getShareUrl(generatedLink.token), 'new')}
                  >
                    {copied === 'new' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expires: {formatDate(generatedLink.expires_at)}
                  </span>
                  {generatedLink.has_password && (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Password protected
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(getShareUrl(generatedLink.token), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in new tab
                </Button>
              </div>
            )}

            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? 'Generating...' : 'Generate Share Link'}
            </Button>
          </TabsContent>

          <TabsContent value="links" className="space-y-4 mt-4">
            {loadingLinks ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading share links...
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No share links yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            /shared/{link.token}
                          </span>
                          {getExpirationBadge(link.expires_at)}
                          {link.has_password && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="w-3 h-3" />
                              Protected
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {link.access_count} views
                          </span>
                          {link.last_accessed_at && (
                            <span>Last accessed: {formatDate(link.last_accessed_at)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCopy(
                              getShareUrl(link.token),
                              link.id
                            )
                          }
                        >
                          {copied === link.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={getShareUrl(link.token)}
                        readOnly
                        className="font-mono text-xs h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/cmdb/shared/${link.token}`, '_blank')
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
