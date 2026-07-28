package Koha::Plugin::Com::MarkusMajer::KohaTour;

use Modern::Perl;
use base qw(Koha::Plugins::Base);
use JSON qw(encode_json);

our $VERSION = '0.2.0';

our $metadata = {
    name            => 'KohaTour',
    author          => 'Markus Majer',
    description     => 'Guided tours for the Koha Staff Interface, configurable via JSON.',
    date_authored   => '2026-06-22',
    date_updated    => '2026-07-27',
    minimum_version => '22.11',
    maximum_version => undef,
    version         => $VERSION,
};

sub new {
    my ( $class, $args ) = @_;
    $args->{'metadata'} = $metadata;
    $args->{'metadata'}->{'class'} = $class;
    return $class->SUPER::new($args);
}

sub intranet_js {
    my ($self) = @_;
    my $config      = $self->retrieve_data('tour_config') // '{"tours":[]}';
    my $reset_token = $self->retrieve_data('reset_token') // '0';
    my $tour_js     = $self->_read_file('js/tour.js');

    $config =~ s{</}{<\\/}g;

    return <<~JS;
        <link  rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js\@1.3.1/dist/driver.css" />
        <script src="https://cdn.jsdelivr.net/npm/driver.js\@1.3.1/dist/driver.js.iife.js"></script>
        <script>
          window.KOHA_TOUR_CONFIG      = $config;
          window.KOHA_TOUR_RESET_TOKEN = '$reset_token';
        </script>
        <script>
        $tour_js
        </script>
        JS
}

sub _read_file {
    my ($self, $rel_path) = @_;
    my $path = $self->mbf_path($rel_path);
    if ( -f $path ) {
        open my $fh, '<:encoding(UTF-8)', $path or return '';
        local $/;
        my $content = <$fh>;
        close $fh;
        return $content;
    }
    return '';
}

sub configure {
    my ( $self, $args ) = @_;
    my $cgi = $self->{'cgi'};

    if ( $cgi->param('save') ) {
        $self->store_data({ tour_config => scalar $cgi->param('tour_config') });
        print $cgi->redirect( $self->_configure_url() . '&saved=1' );
        return;
    }

    if ( $cgi->param('reset_default') ) {
        $self->store_data({ tour_config => $self->_default_config() });
        print $cgi->redirect( $self->_configure_url() . '&reset_default=1' );
        return;
    }

    if ( $cgi->param('reset_never') ) {
        $self->store_data({ reset_token => time() });
        print $cgi->redirect( $self->_configure_url() . '&reset=1' );
        return;
    }

    my $template = $self->get_template({ file => 'templates/configure.tt' });

    my $config = $self->retrieve_data('tour_config');
    $config = $self->_default_config() unless $config;

    $template->param(
        tour_config   => $config,
        saved         => scalar $cgi->param('saved'),
        reset_done    => scalar $cgi->param('reset'),
        reset_default => scalar $cgi->param('reset_default'),
    );

    print $cgi->header();
    print $template->output();
}

sub _configure_url {
    my ($self) = @_;
    return '/cgi-bin/koha/plugins/run.pl?class=Koha%3A%3APlugin%3A%3ACom%3A%3AMarkusMajer%3A%3AKohaTour&method=configure';
}

sub _default_config {
    my ($self) = @_;
    my $path = $self->mbf_path('tour.json');
    if ( -f $path ) {
        open my $fh, '<:encoding(UTF-8)', $path or return '{"tours":[]}';
        local $/;
        my $json = <$fh>;
        close $fh;
        return $json;
    }
    return '{"tours":[]}';
}

sub install {
    my ( $self, $args ) = @_;
    $self->store_data({ tour_config => $self->_default_config() });
    return 1;
}

sub upgrade {
    my ( $self, $args ) = @_;
    return 1;
}

sub uninstall {
    my ( $self, $args ) = @_;
    return 1;
}

1;
