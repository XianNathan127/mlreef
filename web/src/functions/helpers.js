/**
 * Run before create
 */
const checkVersion = () => {
  const version = process.env.REACT_APP_VERSION;
  const prevVersion = localStorage.getItem('app:version');
  if (version && prevVersion && !(version.toString() === prevVersion.toString())) {
    localStorage.clear();
  }

  localStorage.setItem('app:version', version);
};

export default checkVersion;


// this returns an error if code is bigger than 400
// added an extra guard to avoid failing by bad json parsing
export const handleResponse = async (res) => {
  let body;
  const NO_CONTENT_STATUS = 204;
  if (res.status !== NO_CONTENT_STATUS) {
    body = await res.json();
  }
  if (!res.ok) {
    const error = new Error();
    error.name = res.statusText;
    error.status = res.status;
    if (body) {
      // error_message and error_name come from Backend and message comes from Gitlab
      error.name = body.error_name || res.statusText;
      error.message = body.message || body.error_message;
    }

    return Promise.reject(error);
  }

  return body;
};

export const generateBreadCrumbs = (selectedProject, customCrumbs) => {
  const {
    gitlabNamespace,
    slug,
    gitlab,
    name,
  } = selectedProject;
  const userKind = gitlab?.namespace?.kind;
  const crumbs = [
    {
      name: `${gitlabNamespace}`,
      href: userKind === 'group' ? `/groups/${gitlabNamespace}` : `/${gitlabNamespace}`,
    },
    {
      name: `${name}`,
      href: `/${gitlabNamespace}/${slug}`,
    },
  ];
  customCrumbs.map((crumb) => crumbs.push(crumb));
  return crumbs;
};

export const removeDuplicatedProjects = (items) => {
  const uniqueIds = Array.from(new Set(items.map((p) => p.id)));

  return uniqueIds.map((id) => items.find((p) => p.id === id));
};

/**
 * Used to replace original url provided by gitlab
 */
export const fixHostname = (url) => {
  if (!url) return '';
  const hostname = window?.location?.hostname;

  return url.replace(/^(https?:\/\/)(.+):/, `$1${hostname}:`);
};
