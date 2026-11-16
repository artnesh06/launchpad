'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe01Icon,
  Message01Icon,
  SentIcon,
  Hashtag01Icon,
  Github01Icon,
  Linkedin01Icon,
  Instagram01Icon,
  YoutubeIcon,
  ArrowUpRight01Icon
} from '@hugeicons/core-free-icons';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: React.ReactNode;
  placeholder: string;
  isValid: boolean;
}

interface SocialLinksProps {
  data: {
    links: SocialLink[];
  };
  onChange: (data: any) => void;
}

const PLATFORM_CONFIGS = {
  website: {
    icon: <Globe className="w-4 h-4" />,
    placeholder: 'https://yourwebsite.com',
    validator: (url: string) => url.startsWith('http://') || url.startsWith('https://'),
    label: 'Website'
  },
  discord: {
    icon: <MessageCircle className="w-4 h-4" />,
    placeholder: 'https://discord.gg/your-server',
    validator: (url: string) => url.includes('discord.gg/') || url.includes('discord.com/'),
    label: 'Discord'
  },
  telegram: {
    icon: <Send className="w-4 h-4" />,
    placeholder: 'https://t.me/yourchannel',
    validator: (url: string) => url.includes('t.me/'),
    label: 'Telegram'
  },
  twitter: {
    icon: <Hash className="w-4 h-4" />,
    placeholder: 'https://twitter.com/yourusername',
    validator: (url: string) => url.includes('twitter.com/') || url.includes('x.com/'),
    label: 'Twitter/X'
  },
  github: {
    icon: <Github className="w-4 h-4" />,
    placeholder: 'https://github.com/yourusername',
    validator: (url: string) => url.includes('github.com/'),
    label: 'GitHub'
  },
  linkedin: {
    icon: <Linkedin className="w-4 h-4" />,
    placeholder: 'https://linkedin.com/in/yourusername',
    validator: (url: string) => url.includes('linkedin.com/'),
    label: 'LinkedIn'
  },
  instagram: {
    icon: <Instagram className="w-4 h-4" />,
    placeholder: 'https://instagram.com/yourusername',
    validator: (url: string) => url.includes('instagram.com/'),
    label: 'Instagram'
  },
  youtube: {
    icon: <Youtube className="w-4 h-4" />,
    placeholder: 'https://youtube.com/@yourchannel',
    validator: (url: string) => url.includes('youtube.com/'),
    label: 'YouTube'
  }
};

export function SocialLinks({ data, onChange }: SocialLinksProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    data.links.map(link => link.platform)
  );

  const addPlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) return;

    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    const newLink: SocialLink = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      url: '',
      icon: config.icon,
      placeholder: config.placeholder,
      isValid: false
    };

    setSelectedPlatforms([...selectedPlatforms, platform]);
    onChange({
      ...data,
      links: [...data.links, newLink]
    });
  };

  const removePlatform = (platform: string) => {
    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    onChange({
      ...data,
      links: data.links.filter(link => link.platform !== platform)
    });
  };

  const updateLink = (platform: string, url: string) => {
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    const isValid = url === '' || config.validator(url);

    onChange({
      ...data,
      links: data.links.map(link =>
        link.platform === platform
          ? { ...link, url, isValid }
          : link
      )
    });
  };

  const getAvailablePlatforms = () => {
    return Object.keys(PLATFORM_CONFIGS).filter(
      platform => !selectedPlatforms.includes(platform)
    );
  };

  return (
    <Card className="border-2 border-border/50 hover:border-border transition-colors">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold">Social Links</h4>
            <p className="text-xs text-muted-foreground">
              Connect your collection to social media platforms
            </p>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-1">
            {data.links.filter(link => link.url && link.isValid).length} connected
          </Badge>
        </div>

        {/* Platform Selection */}
        {getAvailablePlatforms().length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Add Social Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {getAvailablePlatforms().map(platform => {
                const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
                return (
                  <Button
                    key={platform}
                    variant="outline"
                    size="sm"
                    onClick={() => addPlatform(platform)}
                    className="flex items-center gap-2"
                  >
                    {config.icon}
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Social Links List */}
        <div className="space-y-4">
          {data.links.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <ExternalLink className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No social links added yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add social media links to help your community discover and connect with your collection
              </p>
            </div>
          ) : (
            data.links.map((link) => {
              const config = PLATFORM_CONFIGS[link.platform as keyof typeof PLATFORM_CONFIGS];
              return (
                <div key={link.id} className="flex items-center gap-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {link.icon}
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>

                  <div className="flex-1">
                    <Input
                      placeholder={link.placeholder}
                      value={link.url}
                      onChange={(e) => updateLink(link.platform, e.target.value)}
                      className={`${link.url && !link.isValid
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : link.url && link.isValid
                            ? 'border-green-500 focus-visible:ring-green-500'
                            : ''
                        }`}
                    />
                    {link.url && !link.isValid && (
                      <p className="text-xs text-red-500 mt-1">
                        Please enter a valid {config.label} URL
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {link.url && link.isValid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlatform(link.platform)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Links Summary */}
        {data.links.length > 0 && (
          <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-5 border border-border/50">
            <h5 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-xs">🔗</span>
              </div>
              Links Summary
            </h5>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Total Links</span>
                <p className="text-lg font-bold text-primary">{data.links.length}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Valid Links</span>
                <p className="text-lg font-bold text-green-600">
                  {data.links.filter(link => link.url && link.isValid).length}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Invalid Links</span>
                <p className="text-lg font-bold text-red-600">
                  {data.links.filter(link => link.url && !link.isValid).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicators */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h5 className="text-sm font-medium mb-3 text-foreground">Completion Status</h5>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${data.links.length > 0 ? 'bg-blue-500' : 'bg-muted-foreground/30'}`} />
              <span className={`text-xs ${data.links.length > 0 ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-muted-foreground'}`}>
                Links Added
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${data.links.some(link => link.url && link.isValid) ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              <span className={`text-xs ${data.links.some(link => link.url && link.isValid) ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                Valid Links
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-200" />
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}