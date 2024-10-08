import { EC2Client, DescribeSecurityGroupsCommand, RevokeSecurityGroupIngressCommand, AuthorizeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
const ec2Client = new EC2Client();

export const runEveryMinute = async () => {
    const newIps = (await (await fetch(`https://ip-ranges.amazonaws.com/ip-ranges.json`)).json()).prefixes
        .filter(obj => obj.region === 'us-east-2' && obj.service === 'EC2').map(obj => obj.ip_prefix);
    const existingIps = (await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupIds: [process.env.DB_SECURITY_GROUP] }))).SecurityGroups
        .map(securityGroup => securityGroup.IpPermissions
            .map(ipPermission => ipPermission.IpRanges
                .filter(obj => obj.Description === 'Lambda')
                .map(ipRange => ipRange.CidrIp)
            ).flat()
        ).flat();
    const addedIps = newIps.filter(newIp => !existingIps.includes(newIp));
    const removedIps = existingIps.filter(existingIp => !newIps.includes(existingIp));
    if (removedIps.length > 0) {
        try {
            await ec2Client.send(new RevokeSecurityGroupIngressCommand({
                GroupId: process.env.DB_SECURITY_GROUP,
                IpPermissions: removedIps.map(ip => ({
                    FromPort: 5432,
                    IpProtocol: 'tcp',
                    IpRanges: [{
                        CidrIp: ip,
                        Description: 'Lambda'
                    }],
                    ToPort: 5432,
                }))
            }));
        }
        catch (err) { console.log(err); }
    }
    if (addedIps.length > 0) {
        try {
            await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
                GroupId: process.env.DB_SECURITY_GROUP,
                IpPermissions: addedIps.map(ip => ({
                    FromPort: 5432,
                    IpProtocol: 'tcp',
                    IpRanges: [{
                        CidrIp: ip,
                        Description: 'Lambda'
                    }],
                    ToPort: 5432,
                }))
            }));
        }
        catch (err) { console.log(err); }
    }
    return;
}