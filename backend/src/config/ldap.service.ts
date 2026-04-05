import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as ldap from 'ldapjs';
import { ConfigService } from '../config/configuration';

export interface LdapUser {
  dn: string;
  uid: string;
  email: string;
  name: string;
  groups: string[];
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private configService: ConfigService) {}

  async authenticate(username: string, password: string): Promise<LdapUser | null> {
    const config = this.configService.getLdapConfig();

    if (!config.enabled) {
      this.logger.log('LDAP is disabled');
      return null;
    }

    return new Promise((resolve) => {
      const client = ldap.createClient({
        url: config.url,
        timeout: 5000,
        connectTimeout: 5000,
      });

      client.on('error', (err) => {
        this.logger.error(`LDAP connection error: ${err.message}`);
        resolve(null);
      });

      // First bind with service account
      client.bind(config.bindDN, config.bindPassword, (bindErr) => {
        if (bindErr) {
          this.logger.error(`LDAP bind failed: ${bindErr.message}`);
          client.destroy();
          resolve(null);
          return;
        }

        // Search for user
        const searchFilter = config.searchFilter.replace('{{username}}', username);
        const searchOptions: ldap.SearchOptions = {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['uid', 'mail', 'cn', 'memberOf'],
        };

        client.search(config.searchBase, searchOptions, (searchErr, res) => {
          if (searchErr) {
            this.logger.error(`LDAP search failed: ${searchErr.message}`);
            client.destroy();
            resolve(null);
            return;
          }

          let userEntry: ldap.SearchEntry | null = null;

          res.on('searchEntry', (entry) => {
            userEntry = entry;
          });

          res.on('error', (err) => {
            this.logger.error(`LDAP search error: ${err.message}`);
            client.destroy();
            resolve(null);
          });

          res.on('end', () => {
            if (!userEntry) {
              this.logger.warn(`User not found: ${username}`);
              client.destroy();
              resolve(null);
              return;
            }

            // Try to bind as the user to verify password
            const userDN = userEntry.objectName;
            client.bind(userDN, password, (userBindErr) => {
              if (userBindErr) {
                this.logger.warn(`LDAP user authentication failed for: ${username}`);
                client.destroy();
                resolve(null);
                return;
              }

              // Extract user attributes
              const user: LdapUser = {
                dn: userDN,
                uid: this.getAttributeValue(userEntry, 'uid') || username,
                email: this.getAttributeValue(userEntry, 'mail') || `${username}@ldap.local`,
                name: this.getAttributeValue(userEntry, 'cn') || username,
                groups: this.getAttributeValues(userEntry, 'memberOf'),
              };

              this.logger.log(`LDAP authentication successful: ${username}`);
              client.destroy();
              resolve(user);
            });
          });
        });
      });
    });
  }

  async findUser(username: string): Promise<LdapUser | null> {
    const config = this.configService.getLdapConfig();

    if (!config.enabled) {
      return null;
    }

    return new Promise((resolve) => {
      const client = ldap.createClient({
        url: config.url,
        timeout: 5000,
      });

      client.on('error', (err) => {
        this.logger.error(`LDAP connection error: ${err.message}`);
        resolve(null);
      });

      client.bind(config.bindDN, config.bindPassword, (bindErr) => {
        if (bindErr) {
          client.destroy();
          resolve(null);
          return;
        }

        const searchFilter = config.searchFilter.replace('{{username}}', username);
        client.search(config.searchBase, {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['uid', 'mail', 'cn', 'memberOf'],
        }, (searchErr, res) => {
          if (searchErr) {
            client.destroy();
            resolve(null);
            return;
          }

          let userEntry: ldap.SearchEntry | null = null;

          res.on('searchEntry', (entry) => {
            userEntry = entry;
          });

          res.on('end', () => {
            if (!userEntry) {
              resolve(null);
            } else {
              resolve({
                dn: userEntry.objectName,
                uid: this.getAttributeValue(userEntry, 'uid') || username,
                email: this.getAttributeValue(userEntry, 'mail') || `${username}@ldap.local`,
                name: this.getAttributeValue(userEntry, 'cn') || username,
                groups: this.getAttributeValues(userEntry, 'memberOf'),
              });
            }
            client.destroy();
          });
        });
      });
    });
  }

  async syncUsers(): Promise<LdapUser[]> {
    const config = this.configService.getLdapConfig();

    if (!config.enabled) {
      return [];
    }

    return new Promise((resolve) => {
      const client = ldap.createClient({
        url: config.url,
        timeout: 10000,
      });

      client.bind(config.bindDN, config.bindPassword, (bindErr) => {
        if (bindErr) {
          client.destroy();
          resolve([]);
          return;
        }

        client.search(config.searchBase, {
          filter: '(objectClass=person)',
          scope: 'sub',
          attributes: ['uid', 'mail', 'cn', 'memberOf'],
        }, (searchErr, res) => {
          if (searchErr) {
            client.destroy();
            resolve([]);
            return;
          }

          const users: LdapUser[] = [];

          res.on('searchEntry', (entry) => {
            users.push({
              dn: entry.objectName,
              uid: this.getAttributeValue(entry, 'uid') || '',
              email: this.getAttributeValue(entry, 'mail') || '',
              name: this.getAttributeValue(entry, 'cn') || '',
              groups: this.getAttributeValues(entry, 'memberOf'),
            });
          });

          res.on('end', () => {
            this.logger.log(`LDAP sync: found ${users.length} users`);
            client.destroy();
            resolve(users);
          });
        });
      });
    });
  }

  private getAttributeValue(entry: ldap.SearchEntry, attr: string): string | null {
    const object = entry.pojo ? entry.pojo.attributes : entry.attributes;
    for (const attribute of object) {
      if (attribute.type === attr && attribute.values && attribute.values.length > 0) {
        return attribute.values[0];
      }
    }
    return null;
  }

  private getAttributeValues(entry: ldap.SearchEntry, attr: string): string[] {
    const object = entry.pojo ? entry.pojo.attributes : entry.attributes;
    for (const attribute of object) {
      if (attribute.type === attr && attribute.values) {
        return attribute.values;
      }
    }
    return [];
  }
}
