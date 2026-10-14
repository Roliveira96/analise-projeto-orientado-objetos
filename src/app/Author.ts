/** A contact link shown on the cover. */
export interface AuthorLink {
  label: string;
  url: string;
  icon: string;
}

export interface AuthorProfile {
  name: string;
  role: string;
  location: string;
  about: string;
  photo: string;
  links: AuthorLink[];
}

/** Card of the student presenting the work. */
export class Author {
  private readonly profile: AuthorProfile;
  private readonly caption: string;
  private readonly photoAlt: string;

  constructor(profile: AuthorProfile, caption: string, photoAlt: string) {
    this.profile = profile;
    this.caption = caption;
    this.photoAlt = photoAlt;
  }

  public renderHtml(): string {
    const links: string = this.profile.links
      .map((link: AuthorLink) =>
        '<a class="author-link" href="' + link.url + '" target="_blank" rel="noopener">' +
        link.icon + '<span>' + link.label + '</span></a>')
      .join('');
    return '<section class="author">' +
      '<img class="author-photo" src="' + this.profile.photo + '" alt="' + this.photoAlt + '" width="112" height="112">' +
      '<div class="author-data">' +
      '  <span class="author-caption">' + this.caption + '</span>' +
      '  <h2>' + this.profile.name + '</h2>' +
      '  <p class="author-role">' + this.profile.role + ' · ' + this.profile.location + '</p>' +
      '  <p class="author-about">' + this.profile.about + '</p>' +
      '  <nav class="author-links">' + links + '</nav>' +
      '</div>' +
      '</section>';
  }
}
